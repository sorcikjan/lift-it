/**
 * Výpočty progresu (PRD, kapitola Progres a statistiky). Čisté funkce nad zalogovanými sériemi.
 * Výchozí stav (baseline) je první zalogovaný trénink každého cviku.
 */
import type { LoggedSet, Session } from './types';

export type SetLike = Pick<LoggedSet, 'exercise_id' | 'session_id' | 'reps' | 'weight_kg' | 'time_s' | 'kind' | 'skipped' | 'archived' | 'logged_at'>;
type SessionLike = Pick<Session, 'id' | 'started_at' | 'ended_at' | 'status' | 'archived'>;

/** Odhad 1RM podle Epleyho: váha × (1 + opakování / 30); jen pro 1–12 opakování. */
export function e1rm(weight: number | null, reps: number | null): number | null {
  if (!weight || weight <= 0 || !reps || reps < 1 || reps > 12) return null;
  return weight * (1 + reps / 30);
}

const working = (s: SetLike) => !s.archived && !s.skipped && s.kind !== 'warmup';

export interface ExerciseSessionStat {
  sessionId: string;
  date: string;
  maxWeight: number | null;       // nejvyšší váha pracovní série
  bestE1rm: number | null;
  bestSet: { weight: number | null; reps: number | null; time: number | null } | null;
  volume: number;                 // Σ váha × opakování
  maxTime: number | null;
  maxReps: number | null;
}

/** Statistika jednoho cviku po trénincích, chronologicky. */
export function exerciseHistory(exerciseId: string, sets: SetLike[], sessions: SessionLike[]): ExerciseSessionStat[] {
  const done = new Map(sessions.filter((s) => !s.archived && s.status !== 'abandoned').map((s) => [s.id, s]));
  const bySession = new Map<string, SetLike[]>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId || !working(s) || !done.has(s.session_id)) continue;
    const arr = bySession.get(s.session_id) ?? [];
    arr.push(s);
    bySession.set(s.session_id, arr);
  }
  const out: ExerciseSessionStat[] = [];
  for (const [sid, ss] of bySession) {
    let maxWeight: number | null = null, bestE: number | null = null, volume = 0, maxTime: number | null = null, maxReps: number | null = null;
    let bestSet: ExerciseSessionStat['bestSet'] = null;
    for (const s of ss) {
      const w = s.weight_kg == null ? null : Number(s.weight_kg);
      if (w != null && w > 0 && (maxWeight == null || w > maxWeight)) maxWeight = w;
      if (w && s.reps) volume += w * s.reps;
      if (s.time_s != null && (maxTime == null || s.time_s > maxTime)) maxTime = s.time_s;
      if (s.reps != null && (maxReps == null || s.reps > maxReps)) maxReps = s.reps;
      const e = e1rm(w, s.reps);
      if (e != null && (bestE == null || e > bestE)) { bestE = e; bestSet = { weight: w, reps: s.reps, time: null }; }
    }
    if (!bestSet) {
      const top = [...ss].sort((a, b) => (Number(b.weight_kg ?? 0) - Number(a.weight_kg ?? 0)) || ((b.reps ?? 0) - (a.reps ?? 0)) || ((b.time_s ?? 0) - (a.time_s ?? 0)))[0];
      bestSet = { weight: top.weight_kg == null ? null : Number(top.weight_kg), reps: top.reps, time: top.time_s };
    }
    out.push({ sessionId: sid, date: done.get(sid)!.started_at, maxWeight, bestE1rm: bestE, bestSet, volume, maxTime, maxReps });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Změna od začátku v %: (poslední odhad 1RM − první) / první. U cviků bez váhy podle opakování / času. */
export function changeFromStart(h: ExerciseSessionStat[]): number | null {
  if (h.length < 2) return h.length ? 0 : null;
  const metric = (x: ExerciseSessionStat) => x.bestE1rm ?? x.maxWeight ?? x.maxTime ?? x.maxReps;
  const first = metric(h[0]), last = metric(h[h.length - 1]);
  if (first == null || last == null || first === 0) return null;
  return (last - first) / first;
}

export type RecordType = 'weight' | 'e1rm' | 'reps';
export interface PersonalRecord {
  exerciseId: string;
  type: RecordType;
  value: number;
  previous: number | null;
  weight: number | null;     // u „reps“ při jaké váze
  reps: number | null;
  sessionId: string;
  date: string;
}

/**
 * Osobní rekordy chronologicky (D3): nové maximum váhy, odhadu 1RM nebo opakování při dané váze.
 * První trénink cviku je výchozí stav, ne rekord.
 */
export function recordHistory(sets: SetLike[], sessions: SessionLike[]): PersonalRecord[] {
  const done = new Map(sessions.filter((s) => !s.archived && s.status !== 'abandoned').map((s) => [s.id, s]));
  const ordered = sets.filter((s) => working(s) && done.has(s.session_id))
    .sort((a, b) => (done.get(a.session_id)!.started_at < done.get(b.session_id)!.started_at ? -1 : a.logged_at < b.logged_at ? -1 : 1));
  const firstSession = new Map<string, string>();
  const best = new Map<string, { weight: number | null; e1rm: number | null; repsAt: Map<number, number> }>();
  const out: PersonalRecord[] = [];
  const bestInSession = new Map<string, PersonalRecord>();
  for (const s of ordered) {
    const ex = s.exercise_id;
    if (!firstSession.has(ex)) firstSession.set(ex, s.session_id);
    const isBaseline = firstSession.get(ex) === s.session_id;
    const b = best.get(ex) ?? { weight: null, e1rm: null, repsAt: new Map() };
    const w = s.weight_kg == null ? null : Number(s.weight_kg);
    const date = done.get(s.session_id)!.started_at;
    const push = (type: RecordType, value: number, previous: number | null) => {
      const key = `${s.session_id}:${ex}:${type}${type === 'reps' ? `:${w}` : ''}`;
      const rec: PersonalRecord = { exerciseId: ex, type, value, previous, weight: w, reps: s.reps, sessionId: s.session_id, date };
      // V rámci jednoho tréninku jen nejlepší výsledek; „předchozí“ zůstává z dřívějška.
      const prev = bestInSession.get(key);
      if (prev) { prev.value = value; prev.reps = s.reps; prev.weight = w; return; }
      bestInSession.set(key, rec);
      out.push(rec);
    };
    if (w != null && w > 0 && (b.weight == null || w > b.weight)) {
      if (!isBaseline) push('weight', w, b.weight);
      b.weight = w;
    }
    const e = e1rm(w, s.reps);
    if (e != null && (b.e1rm == null || e > b.e1rm + 1e-9)) {
      if (!isBaseline) push('e1rm', e, b.e1rm);
      b.e1rm = e;
    }
    if (w != null && s.reps != null) {
      const prevReps = b.repsAt.get(w);
      if (prevReps == null || s.reps > prevReps) {
        if (!isBaseline && prevReps != null) push('reps', s.reps, prevReps);
        b.repsAt.set(w, s.reps);
      }
    }
    best.set(ex, b);
  }
  return out;
}

export interface SessionSummary {
  durationMin: number;
  volume: number;
  loggedSets: number;
  plannedSets: number;
}

export function summarize(session: SessionLike, sets: SetLike[], plannedSetCount: number): SessionSummary {
  const own = sets.filter((s) => s.session_id === session.id && !s.archived && !s.skipped);
  const end = session.ended_at ? new Date(session.ended_at) : new Date(own.map((s) => s.logged_at).sort().at(-1) ?? session.started_at);
  return {
    durationMin: Math.max(0, Math.round((end.getTime() - new Date(session.started_at).getTime()) / 60000)),
    volume: own.reduce((v, s) => v + (s.weight_kg && s.reps ? Number(s.weight_kg) * s.reps : 0), 0),
    loggedSets: own.filter((s) => s.kind !== 'warmup').length,
    plannedSets: plannedSetCount,
  };
}

/** Docházka (D4): odcvičené tréninky v týdnu (pondělí–neděle) vs. plán. */
export function attendance(sessions: SessionLike[], weeks: { week_start: string; planned: number }[]) {
  return weeks.map((w) => {
    const start = new Date(w.week_start + 'T00:00:00');
    const end = new Date(start.getTime() + 7 * 86400000);
    const done = sessions.filter((s) => !s.archived && s.status === 'done' && new Date(s.started_at) >= start && new Date(s.started_at) < end).length;
    return { week_start: w.week_start, done, planned: w.planned };
  });
}
