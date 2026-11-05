/** Profil (redesign 11/2026): týdenní pás po–ne a souhrn odcvičeného. */
import type { LoggedSet, Session } from './types';

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
  const done = sessions.filter((s) => s.status === 'done' && !s.archived && s.source === 'app');
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
