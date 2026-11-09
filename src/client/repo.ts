'use client';
/**
 * Lokální repozitář: každý zápis jde v jedné transakci do IndexedDB a do fronty outbox.
 * Odtud ho sync pošle na server, až bude signál (B10).
 */
import type { Table } from 'dexie';
import type {
  Blok, Exercise, LoggedSet, PlanWeek, PlannedExercise, PlannedSet, Program, Session, Workout,
  WorkoutExerciseView, WorkoutView,
} from '@/domain/types';
import { initRunState, reducer, reviveRunState, type RunAction, type RunState } from '@/domain/workout/reducer';
import type { DraftExercise } from '@/domain/plan/parse-sheet';
import type { SyncTable } from '@/shared/sync-tables';
import { db, getMeta, setMeta, type ActiveRun } from './db';
import { exerciseName } from './library';
import { nowIso, uuid } from './uuid';
import { normalizeName } from '@/lib/normalize';

type Row = { id: string } & Record<string, unknown>;

const listeners = new Set<() => void>();
export const onLocalWrite = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Uloží řádky lokálně a zařadí je do fronty k synchronizaci. */
export async function save<T extends Row>(table: SyncTable, rows: T[]): Promise<void> {
  if (!rows.length) return;
  const d = db();
  const t = d.table(table) as Table<T, string>;
  await d.transaction('rw', t, d.outbox, async () => {
    await t.bulkPut(rows);
    await d.outbox.bulkAdd(rows.map((row) => ({ table, row_id: row.id, row: row as Record<string, unknown>, attempts: 0 })));
  });
  listeners.forEach((fn) => fn());
}

// --- Účet a program -----------------------------------------------------------------------

/** Lokální ID uživatele: dokud se nepřihlásí, je náhodné; server vlastníka stejně přepíše. */
export async function localUserId(): Promise<string> {
  let id = await getMeta<string>('userId');
  if (!id) { id = uuid(); await setMeta('userId', id); }
  return id;
}

export async function defaultProgram(): Promise<Program> {
  const existing = (await db().programs.toArray()).filter((p) => !p.archived && !p.coach_id);
  if (existing.length) return existing[0];
  const p: Program = {
    id: uuid(), client_id: await localUserId(), coach_id: null, name: 'Do Vánoc 2026',
    start_date: null, end_date: '2026-12-24', goal: null, archived: false,
  };
  await save('programs', [p as unknown as Row]);
  return p;
}

// --- Plán z importu ---------------------------------------------------------------------------

export interface ResolvedExercise extends DraftExercise { exerciseId: string }
export interface ResolvedWorkout { label: string; title: string | null; exercises: ResolvedExercise[] }

export function mondayOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

function plannedRows(workoutId: string, exs: ResolvedExercise[]) {
  const pes: PlannedExercise[] = [];
  const sets: PlannedSet[] = [];
  exs.forEach((e, i) => {
    const pe: PlannedExercise = {
      id: uuid(), workout_id: workoutId, exercise_id: e.exerciseId, position: i, blok: e.blok ?? 'hlavni',
      group_label: e.group, coach_note: e.note, source_name: e.sourceName, archived: false,
    };
    pes.push(pe);
    e.sets.forEach((s, j) => sets.push({
      id: uuid(), planned_exercise_id: pe.id, number: j + 1, reps_min: s.repsMin, reps_max: s.repsMax,
      weight_kg: s.weightKg, time_s: s.timeS, kind: 'working', to_failure: s.toFailure, archived: false,
    }));
  });
  return { pes, sets };
}

/** Uloží týden z importu (A4, A7). Vrací id týdne. */
export async function saveWeek(opts: {
  workouts: ResolvedWorkout[];
  weekStart: string;
  source: PlanWeek['source'];
  sheetUrl?: string | null;
  sheetTab?: string | null;
  raw: unknown;
}): Promise<string> {
  const program = await defaultProgram();
  const week: PlanWeek = {
    id: uuid(), program_id: program.id, week_start: opts.weekStart, source: opts.source,
    sheet_url: opts.sheetUrl ?? null, sheet_tab: opts.sheetTab ?? null, imported_at: nowIso(),
    raw_snapshot: opts.raw, published: true, archived: false,
  };
  const workouts: Workout[] = [];
  const pes: PlannedExercise[] = [];
  const sets: PlannedSet[] = [];
  opts.workouts.forEach((w, i) => {
    const wo: Workout = { id: uuid(), week_id: week.id, label: w.label, position: i, planned_date: null, note: w.title, archived: false };
    workouts.push(wo);
    const r = plannedRows(wo.id, w.exercises);
    pes.push(...r.pes);
    sets.push(...r.sets);
  });
  await save('plan_weeks', [week as unknown as Row]);
  await save('workouts', workouts as unknown as Row[]);
  await save('planned_exercises', pes as unknown as Row[]);
  await save('planned_sets', sets as unknown as Row[]);
  return week.id;
}

/**
 * Opětovný import stejného sheetu (A5): neodcvičené tréninky se nahradí novým obsahem,
 * odcvičené zůstanou beze změny. Vrací počet aktualizovaných tréninků, nebo null, když týden ještě není.
 */
export async function reimportWeek(sheetUrl: string, sheetTab: string | null, workouts: ResolvedWorkout[], raw: unknown): Promise<number | null> {
  const week = (await db().plan_weeks.toArray()).find((w) => !w.archived && w.sheet_url === sheetUrl && (w.sheet_tab ?? null) === sheetTab);
  if (!week) return null;
  const existing = (await db().workouts.where('week_id').equals(week.id).toArray()).filter((w) => !w.archived);
  const doneWorkouts = new Set((await db().sessions.toArray()).filter((s) => s.workout_id && s.status !== 'abandoned' && !s.archived).map((s) => s.workout_id));
  let updated = 0;
  for (const [i, w] of workouts.entries()) {
    const old = existing.find((x) => x.label === w.label);
    if (old && doneWorkouts.has(old.id)) continue; // odcvičené nikdy nepřepsat
    let wo: Workout;
    if (old) {
      const oldPes = (await db().planned_exercises.where('workout_id').equals(old.id).toArray()).filter((p) => !p.archived);
      const oldSets = await db().planned_sets.where('planned_exercise_id').anyOf(oldPes.map((p) => p.id)).toArray();
      await save('planned_sets', oldSets.map((s) => ({ ...s, archived: true })) as unknown as Row[]);
      await save('planned_exercises', oldPes.map((p) => ({ ...p, archived: true })) as unknown as Row[]);
      wo = { ...old, note: w.title, position: i };
    } else {
      wo = { id: uuid(), week_id: week.id, label: w.label, position: i, planned_date: null, note: w.title, archived: false };
    }
    await save('workouts', [wo as unknown as Row]);
    const r = plannedRows(wo.id, w.exercises);
    await save('planned_exercises', r.pes as unknown as Row[]);
    await save('planned_sets', r.sets as unknown as Row[]);
    updated++;
  }
  await save('plan_weeks', [{ ...week, imported_at: nowIso(), raw_snapshot: raw } as unknown as Row]);
  return updated;
}

/** Vlastní alias po ručním spárování (A3). */
export async function saveAlias(text: string, exerciseId: string) {
  const norm = normalizeName(text);
  if (!norm) return;
  const owner = await localUserId();
  const existing = (await db().exercise_aliases.where('text').equals(norm).toArray()).find((a) => a.owner_id);
  await save('exercise_aliases', [{ id: existing?.id ?? uuid(), text: norm, exercise_id: exerciseId, owner_id: owner }]);
}

/** Vlastní cvik (C4). ID s předponou u- odliší vlastní cviky od knihovny. */
export async function saveCustomExercise(e: Partial<Exercise> & { name_cs: string }): Promise<string> {
  const id = e.id ?? `u-${uuid()}`;
  const row: Exercise = {
    id, name_cs: e.name_cs, name_en: e.name_en ?? '', type: e.type ?? 'weight_reps', equipment: e.equipment ?? null,
    muscles: e.muscles ?? [], images: e.images ?? [], steps_cs: e.steps_cs ?? [], steps_en: [],
    video_url: e.video_url ?? null, source: 'vlastni', license: 'Vlastní', author: null,
    owner_id: await localUserId(), archived: false,
  };
  await save('exercises', [row as unknown as Row]);
  return id;
}

// --- Pohled na trénink -------------------------------------------------------------------------

export async function workoutView(workoutId: string): Promise<WorkoutView | null> {
  const wo = await db().workouts.get(workoutId);
  if (!wo) return null;
  const pes = (await db().planned_exercises.where('workout_id').equals(workoutId).toArray())
    .filter((p) => !p.archived)
    .sort((a, b) => blokRank(a.blok) - blokRank(b.blok) || a.position - b.position);
  const sets = (await db().planned_sets.where('planned_exercise_id').anyOf(pes.map((p) => p.id)).toArray()).filter((s) => !s.archived);
  const exs = await db().exercises.bulkGet(pes.map((p) => p.exercise_id));
  const exercises: WorkoutExerciseView[] = pes.map((p, i) => {
    const ex = exs[i];
    return {
      id: p.id,
      exerciseId: p.exercise_id,
      name: p.source_name || exerciseName(ex) || p.exercise_id,
      type: ex?.type ?? 'weight_reps',
      blok: p.blok,
      group: p.group_label,
      images: ex?.images ?? [],
      steps: ex?.steps_cs ?? [],
      coachNote: p.coach_note,
      equipment: ex?.equipment ?? null,
      sets: sets.filter((s) => s.planned_exercise_id === p.id).sort((a, b) => a.number - b.number).map((s) => ({
        id: s.id, number: s.number, repsMin: s.reps_min, repsMax: s.reps_max, weightKg: s.weight_kg == null ? null : Number(s.weight_kg),
        timeS: s.time_s, kind: s.kind, toFailure: s.to_failure,
      })),
    };
  }).filter((e) => e.sets.length);
  return { workoutId, label: wo.label, exercises };
}

const blokRank = (b: Blok) => (b === 'uvod' ? 0 : b === 'hlavni' ? 1 : 2);

export interface WeekOverview {
  week: PlanWeek;
  workouts: { workout: Workout; done: boolean }[];
  doneCount: number;
  today: Workout | null;
}

/** Aktuální týden pro domov (B1): poslední týden, který už začal, jinak nejbližší další. */
export async function currentWeek(): Promise<WeekOverview | null> {
  const weeks = (await db().plan_weeks.toArray()).filter((w) => !w.archived && w.published !== false && w.source !== 'baseline');
  if (!weeks.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const started = weeks.filter((w) => w.week_start <= today).sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  const upcoming = weeks.filter((w) => w.week_start > today).sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const week = started[0] ?? upcoming[0];
  const workouts = (await db().workouts.where('week_id').equals(week.id).toArray()).filter((w) => !w.archived).sort((a, b) => a.position - b.position);
  const sessions = (await db().sessions.toArray()).filter((s) => s.status === 'done' && !s.archived);
  const items = workouts.map((w) => ({ workout: w, done: sessions.some((s) => s.workout_id === w.id) }));
  return { week, workouts: items, doneCount: items.filter((x) => x.done).length, today: items.find((x) => !x.done)?.workout ?? null };
}

// --- Běh tréninku --------------------------------------------------------------------------------

export async function activeRun(): Promise<ActiveRun | undefined> {
  return db().active_run.get('current');
}

/** Začít trénink: Session + uložený stav automatu. Rozběhnutý trénink se jen obnoví. */
export async function startWorkout(workoutId: string, withCoach = false): Promise<ActiveRun> {
  const current = await activeRun();
  if (current) return current;
  const plan = await workoutView(workoutId);
  if (!plan) throw new Error('workout_missing');
  const session: Session = {
    id: uuid(), user_id: await localUserId(), workout_id: workoutId, started_at: nowIso(), ended_at: null,
    with_coach: withCoach, note: null, status: 'active', actual_order: [], source: 'app',
    strava_activity_id: null, pairing_status: null, hr_avg: null, hr_max: null, kcal: null, garmin_activity_id: null, archived: false,
  };
  const run: ActiveRun = { id: 'current', session_id: session.id, workout_id: workoutId, state: initRunState(plan), updated_at: nowIso() };
  await save('sessions', [session as unknown as Row]);
  await db().active_run.put(run);
  return run;
}

/**
 * Jedna akce na obrazovce tréninku. Stav se uloží hned (B9), nové série jdou do fronty,
 * vrácené tlačítkem Zpět se archivují. Na konci se Session uzavře.
 */
export async function dispatchRun(plan: WorkoutView, action: RunAction): Promise<{ run: ActiveRun | null; finishedSessionId: string | null }> {
  const d = db();
  const run = await activeRun();
  if (!run) return { run: null, finishedSessionId: null };
  const prev = reviveRunState(plan, run.state) ?? initRunState(plan);
  const next = reducer(plan, prev, action);
  if (next === prev) return { run, finishedSessionId: null };

  const prevIds = new Set(prev.log.map((l) => l.id));
  const nextIds = new Set(next.log.map((l) => l.id));
  const added = next.log.filter((l) => !prevIds.has(l.id));
  const removed = prev.log.filter((l) => !nextIds.has(l.id));
  const E = new Map(plan.exercises.map((e) => [e.id, e]));

  const newSets: LoggedSet[] = added.map((l) => {
    const e = E.get(l.peId)!;
    const ps = e.sets[Math.min(l.setIndex, e.sets.length - 1)];
    return {
      id: l.id, session_id: run.session_id, exercise_id: e.exerciseId,
      planned_set_id: l.extra ? null : ps?.id ?? null, planned_exercise_id: e.id,
      number: l.setIndex + 1,
      reps: e.type === 'time' ? null : ps?.repsMax ?? ps?.repsMin ?? null,
      weight_kg: e.type === 'time' ? null : ps?.weightKg ?? null,
      time_s: e.type === 'time' || (ps?.timeS != null && ps.repsMax == null) ? ps?.timeS ?? null : null,
      rpe: null, skipped: false, extra: l.extra, kind: ps?.kind ?? 'working', logged_at: l.at, archived: false,
    };
  });
  const undone = (await d.logged_sets.bulkGet(removed.map((l) => l.id))).filter(Boolean).map((s) => ({ ...s!, archived: true }));

  const updated: ActiveRun = { ...run, state: next, updated_at: nowIso() };
  await d.active_run.put(updated);
  await save('logged_sets', [...newSets, ...undone] as unknown as Row[]);

  if (next.phase === 'finished') {
    const s = await d.sessions.get(run.session_id);
    if (s) {
      // Skutečné pořadí cviků podle prvního zápisu
      const order: string[] = [];
      for (const l of next.log) if (!order.includes(l.peId)) order.push(l.peId);
      await save('sessions', [{ ...s, ended_at: nowIso(), status: 'done', actual_order: order } as unknown as Row]);
    }
    await d.active_run.delete('current');
    return { run: null, finishedSessionId: run.session_id };
  }
  return { run: updated, finishedSessionId: null };
}

/** Ukončit trénink předčasně (tlačítko Ukončit): bez dialogu, odcvičené série zůstanou. */
export async function endWorkoutEarly(): Promise<string | null> {
  const run = await activeRun();
  if (!run) return null;
  const s = await db().sessions.get(run.session_id);
  const logged = await db().logged_sets.where('session_id').equals(run.session_id).filter((x) => !x.archived).count();
  if (s) {
    await save('sessions', [{ ...s, ended_at: nowIso(), status: logged ? 'done' : 'abandoned' } as unknown as Row]);
  }
  await db().active_run.delete('current');
  return logged ? run.session_id : null;
}

/** Opravy ve shrnutí (B12): skutečná opakování a váha. */
export async function updateLoggedSet(id: string, patch: Partial<Pick<LoggedSet, 'reps' | 'weight_kg' | 'time_s' | 'skipped' | 'archived'>>) {
  const s = await db().logged_sets.get(id);
  if (!s) return;
  await save('logged_sets', [{ ...s, ...patch } as unknown as Row]);
}

export async function addExtraLoggedSet(sessionId: string, base: LoggedSet) {
  const sets = await db().logged_sets.where('session_id').equals(sessionId).filter((x) => x.exercise_id === base.exercise_id && !x.archived).toArray();
  await save('logged_sets', [{
    ...base, id: uuid(), planned_set_id: null, number: Math.max(...sets.map((s) => s.number)) + 1, extra: true, logged_at: nowIso(), archived: false,
  } as unknown as Row]);
}

/** B15: cvik navíc mimo plán, přidaný ve shrnutí. Vrací id první série k doplnění. */
export async function addExtraExercise(sessionId: string, exerciseId: string): Promise<string> {
  const ex = await db().exercises.get(exerciseId);
  const id = uuid();
  await save('logged_sets', [{
    id, session_id: sessionId, exercise_id: exerciseId, planned_set_id: null, planned_exercise_id: null, number: 1,
    reps: null, weight_kg: null, time_s: ex?.type === 'time' ? 0 : null, rpe: null, skipped: false, extra: true, kind: 'working',
    logged_at: nowIso(), archived: false,
  } satisfies LoggedSet as unknown as Row]);
  return id;
}

export async function updateSession(id: string, patch: Partial<Session>) {
  const s = await db().sessions.get(id);
  if (!s) return;
  await save('sessions', [{ ...s, ...patch } as unknown as Row]);
}

/** Odcvičené tréninky od nejnovějšího (profil): datum, trénink, počet sérií. */
export async function doneSessions(): Promise<{ id: string; startedAt: string; label: string | null; sets: number; coach: boolean; paid: boolean | null }[]> {
  const d = db();
  const sessions = (await d.sessions.toArray()).filter((s) => s.status === 'done' && !s.archived && (s.source === 'app' || s.source === 'coach'))
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  const sets = (await d.logged_sets.toArray()).filter((x) => !x.archived && !x.skipped);
  const labels = new Map((await d.workouts.bulkGet(sessions.map((s) => s.workout_id ?? ''))).filter(Boolean).map((w) => [w!.id, w!.label]));
  return sessions.map((s) => ({ id: s.id, startedAt: s.started_at, label: s.workout_id ? labels.get(s.workout_id) ?? null : null, sets: sets.filter((x) => x.session_id === s.id).length, coach: s.source === 'coach', paid: s.paid ?? null }));
}

/** Smazat trénink (třeba zkušební): trénink, jeho série a poznámky se archivují, zmizí z historie i Progresu. */
export async function archiveSession(id: string) {
  const d = db();
  const s = await d.sessions.get(id);
  if (!s) return;
  const sets = await d.logged_sets.where('session_id').equals(id).toArray();
  const notes = await d.session_notes.where('session_id').equals(id).toArray();
  await save('logged_sets', sets.map((x) => ({ ...x, archived: true })) as unknown as Row[]);
  await save('session_notes', notes.map((x) => ({ ...x, archived: true })) as unknown as Row[]);
  await save('sessions', [{ ...s, archived: true } as unknown as Row]);
  if ((await d.active_run.get('current'))?.session_id === id) await d.active_run.delete('current');
}

/** Poznámka ke cviku nebo k tréninku (B13). Jedna poznámka na cvik v tréninku, přepisuje se. */
export async function saveNote(sessionId: string, exerciseId: string | null, text: string) {
  const existing = (await db().session_notes.where('session_id').equals(sessionId).toArray()).find((n) => n.exercise_id === exerciseId && !n.archived);
  await save('session_notes', [{ id: existing?.id ?? uuid(), session_id: sessionId, exercise_id: exerciseId, text, archived: !text.trim() }]);
}

// --- Ruční úprava plánu (A6) -----------------------------------------------------------------

export async function saveWorkoutEdit(workoutId: string, exercises: { exerciseId: string; blok: Blok; group: string | null; note: string | null; sets: { repsMax: number | null; weightKg: number | null; timeS: number | null }[] }[]) {
  const oldPes = (await db().planned_exercises.where('workout_id').equals(workoutId).toArray()).filter((p) => !p.archived);
  const oldSets = await db().planned_sets.where('planned_exercise_id').anyOf(oldPes.map((p) => p.id)).toArray();
  await save('planned_sets', oldSets.map((s) => ({ ...s, archived: true })) as unknown as Row[]);
  await save('planned_exercises', oldPes.map((p) => ({ ...p, archived: true })) as unknown as Row[]);
  const r = plannedRows(workoutId, exercises.map((e, i) => ({
    row: i, sourceName: '', exerciseId: e.exerciseId, blok: e.blok, group: e.group, restS: null, note: e.note, issues: [], bodyweight: false,
    sets: e.sets.map((s) => ({ repsMin: s.repsMax, repsMax: s.repsMax, weightKg: s.weightKg, timeS: s.timeS, toFailure: false })),
  })));
  await save('planned_exercises', r.pes as unknown as Row[]);
  await save('planned_sets', r.sets as unknown as Row[]);
}

export async function createEmptyWorkout(label = 'A'): Promise<string> {
  const program = await defaultProgram();
  const weekStart = mondayOf();
  let week = (await db().plan_weeks.toArray()).find((w) => !w.archived && w.week_start === weekStart && w.program_id === program.id);
  if (!week) {
    week = { id: uuid(), program_id: program.id, week_start: weekStart, source: 'manual', sheet_url: null, sheet_tab: null, imported_at: nowIso(), raw_snapshot: null, published: true, archived: false };
    await save('plan_weeks', [week as unknown as Row]);
  }
  const count = await db().workouts.where('week_id').equals(week.id).filter((w) => !w.archived).count();
  const wo: Workout = { id: uuid(), week_id: week.id, label: count ? String.fromCharCode(65 + count) : label, position: count, planned_date: null, note: null, archived: false };
  await save('workouts', [wo as unknown as Row]);
  return wo.id;
}

/** „Minule“ pro cviky tréninku (nový design obrazovky tréninku). */
export async function lastTimesFor(exerciseIds: string[], currentSessionId: string | null) {
  const { lastTimes } = await import('@/domain/workout/last');
  const d = db();
  const sets = await d.logged_sets.where('exercise_id').anyOf(exerciseIds).toArray();
  const sessions = (await d.sessions.bulkGet([...new Set(sets.map((s) => s.session_id))])).filter((s): s is Session => !!s);
  return lastTimes(sets, sessions, currentSessionId);
}
