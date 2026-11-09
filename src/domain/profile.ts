/** Profil (redesign 11/2026): týdenní pás po–ne a souhrn odcvičeného. */
import type { LoggedSet, Session } from './types';
import { changeFromStart, exerciseHistory } from './progress';

/** Pondělí týdne v místním čase jako YYYY-MM-DD. */
function mondayKey(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface ProfileSummary {
  workouts: number;
  sets: number;
  thisWeek: number;
  since: string | null;     // ISO začátku prvního tréninku
  week: boolean[];          // po–ne: byl ten den trénink?
}

export function profileSummary(sessions: Session[], sets: LoggedSet[], now = new Date()): ProfileSummary {
  const done = sessions.filter((s) => s.status === 'done' && !s.archived && (s.source === 'app' || s.source === 'coach'));
  const ids = new Set(done.map((s) => s.id));
  const mon = mondayKey(now);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return key(d); });
  const doneDays = new Set(done.map((s) => key(new Date(s.started_at))));
  const since = done.map((s) => s.started_at).sort()[0] ?? null;
  return {
    workouts: done.length,
    sets: sets.filter((x) => ids.has(x.session_id) && !x.archived && !x.skipped).length,
    thisWeek: done.filter((s) => days.includes(key(new Date(s.started_at)))).length,
    since,
    week: days.map((d) => doneDays.has(d)),
  };
}

export interface StrengthTrend { change: number; up: number; down: number; total: number; since: string }

/**
 * „Jdeš tímto směrem“ (profil): u cviků odcvičených aspoň dvakrát průměrná změna síly
 * (odhad 1RM, jinak váha / čas / opakování) od prvního záznamu. Méně než 2 cviky = null.
 */
export function strengthTrend(sessions: Session[], sets: LoggedSet[]): StrengthTrend | null {
  const ids = [...new Set(sets.filter((s) => !s.archived && !s.skipped).map((s) => s.exercise_id))];
  const changes: { c: number; since: string }[] = [];
  for (const id of ids) {
    const h = exerciseHistory(id, sets, sessions);
    const c = h.length >= 2 ? changeFromStart(h) : null;
    if (c != null) changes.push({ c, since: h[0].date });
  }
  if (changes.length < 2) return null;
  return {
    change: changes.reduce((m, x) => m + x.c, 0) / changes.length,
    up: changes.filter((x) => x.c > 0.001).length,
    down: changes.filter((x) => x.c < -0.001).length,
    total: changes.length,
    since: changes.map((x) => x.since).sort()[0],
  };
}
