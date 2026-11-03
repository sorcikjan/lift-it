/**
 * Editor plánu trenéra (E3) jako čisté funkce nad řádky plánu.
 * Nic se nemaže: úprava archivuje staré řádky a vytvoří nové (PRD: jen archivace).
 */
import { roundKg } from '../format';
import type { Blok, PlanWeek, PlannedExercise, PlannedSet, Session, Workout } from '../types';

export interface PlanRows { plan_weeks: PlanWeek[]; workouts: Workout[]; planned_exercises: PlannedExercise[]; planned_sets: PlannedSet[] }
export interface WeekTree { week: PlanWeek; workouts: Workout[]; exercises: PlannedExercise[]; sets: PlannedSet[] }

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekTree(weekId: string, rows: PlanRows): WeekTree | null {
  const week = rows.plan_weeks.find((w) => w.id === weekId && !w.archived);
  if (!week) return null;
  const workouts = rows.workouts.filter((w) => w.week_id === weekId && !w.archived).sort((a, b) => a.position - b.position);
  const wPos = new Map(workouts.map((w, i) => [w.id, i]));
  const exercises = rows.planned_exercises.filter((p) => wPos.has(p.workout_id) && !p.archived)
    .sort((a, b) => wPos.get(a.workout_id)! - wPos.get(b.workout_id)! || a.position - b.position);
  const pPos = new Map(exercises.map((p, i) => [p.id, i]));
  const sets = rows.planned_sets.filter((s) => pPos.has(s.planned_exercise_id) && !s.archived)
    .sort((a, b) => pPos.get(a.planned_exercise_id)! - pPos.get(b.planned_exercise_id)! || a.number - b.number);
  return { week, workouts, exercises, sets };
}

/** Poslední týden programu (podle začátku), z něhož se kopíruje. Historie (baseline) se nekopíruje. */
export function latestWeek(rows: PlanRows): PlanWeek | null {
  return rows.plan_weeks.filter((w) => !w.archived && w.source !== 'baseline').sort((a, b) => (a.week_start < b.week_start ? 1 : -1))[0] ?? null;
}

/** Kopie týdne do následujícího týdne jako koncept (klient ho uvidí až po publikaci). */
export function copyWeek(src: WeekTree, newId: () => string, now: string): WeekTree {
  const week: PlanWeek = {
    ...src.week, id: newId(), week_start: addDays(src.week.week_start, 7), source: 'app', sheet_url: null, sheet_tab: null,
    imported_at: now, raw_snapshot: null, published: false, archived: false,
  };
  delete week.updated_at;
  const wMap = new Map(src.workouts.map((w) => [w.id, newId()]));
  const pMap = new Map(src.exercises.map((p) => [p.id, newId()]));
  return {
    week,
    workouts: src.workouts.map(({ updated_at: _u, ...w }) => ({ ...w, id: wMap.get(w.id)!, week_id: week.id, planned_date: w.planned_date ? addDays(w.planned_date, 7) : null })),
    exercises: src.exercises.map(({ updated_at: _u, ...p }) => ({ ...p, id: pMap.get(p.id)!, workout_id: wMap.get(p.workout_id)! })),
    sets: src.sets.map(({ updated_at: _u, ...s }) => ({ ...s, id: newId(), planned_exercise_id: pMap.get(s.planned_exercise_id)! })),
  };
}

/** Hromadně +2,5 kg: jen série s váhou (vlastní váha a čas zůstanou). Vrací změněné série. */
export function bumpWeights(tree: WeekTree, kg = 2.5): PlannedSet[] {
  return tree.sets.filter((s) => s.weight_kg != null && Number(s.weight_kg) > 0)
    .map((s) => ({ ...s, weight_kg: roundKg(Number(s.weight_kg) + kg) }));
}

export interface EditExercise {
  exerciseId: string; blok: Blok; group: string | null; note: string | null; sourceName: string | null;
  sets: { repsMax: number | null; weightKg: number | null; timeS: number | null }[];
}

/** Úprava tréninku: staré cviky a série archivuje, nové vytvoří v daném pořadí. */
export function replaceWorkout(tree: WeekTree, workoutId: string, items: EditExercise[], newId: () => string) {
  const oldPes = tree.exercises.filter((p) => p.workout_id === workoutId);
  const oldIds = new Set(oldPes.map((p) => p.id));
  const archived = {
    planned_exercises: oldPes.map((p) => ({ ...p, archived: true })),
    planned_sets: tree.sets.filter((s) => oldIds.has(s.planned_exercise_id)).map((s) => ({ ...s, archived: true })),
  };
  const created: { planned_exercises: PlannedExercise[]; planned_sets: PlannedSet[] } = { planned_exercises: [], planned_sets: [] };
  items.forEach((e, i) => {
    const pe: PlannedExercise = {
      id: newId(), workout_id: workoutId, exercise_id: e.exerciseId, position: i, blok: e.blok, group_label: e.group,
      coach_note: e.note, source_name: e.sourceName, archived: false,
    };
    created.planned_exercises.push(pe);
    e.sets.forEach((s, j) => created.planned_sets.push({
      id: newId(), planned_exercise_id: pe.id, number: j + 1, reps_min: s.repsMax, reps_max: s.repsMax,
      weight_kg: s.weightKg == null ? null : roundKg(s.weightKg), time_s: s.timeS, kind: 'working', to_failure: false, archived: false,
    }));
  });
  return { archived, created };
}

export interface WeekStat { weekId: string; weekStart: string; published: boolean; planned: number; done: number }

/** E4: odcvičeno vs. plán po týdnech (nejnovější první). */
export function weekStats(rows: PlanRows, sessions: Pick<Session, 'workout_id' | 'status' | 'archived'>[]): WeekStat[] {
  const done = new Set(sessions.filter((s) => s.status === 'done' && !s.archived && s.workout_id).map((s) => s.workout_id));
  return rows.plan_weeks.filter((w) => !w.archived && w.source !== 'baseline')
    .sort((a, b) => (a.week_start < b.week_start ? 1 : -1))
    .map((w) => {
      const wos = rows.workouts.filter((x) => x.week_id === w.id && !x.archived);
      return { weekId: w.id, weekStart: w.week_start, published: w.published, planned: wos.length, done: wos.filter((x) => done.has(x.id)).length };
    });
}
