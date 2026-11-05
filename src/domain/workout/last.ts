/**
 * „Minule“ na kartě tréninku: nejtěžší série cviku z posledního odcvičeného tréninku
 * a rozdíl proti dnešnímu plánu („dnes +2,5 kg“).
 */
import { fmtKg } from '../format';
import type { LoggedSet, Session } from '../types';

export interface LastTime { weightKg: number | null; reps: number | null; timeS: number | null; at: string }

export function lastTimes(sets: LoggedSet[], sessions: Session[], excludeSessionId: string | null): Map<string, LastTime> {
  const done = new Map(sessions.filter((s) => s.status === 'done' && !s.archived && s.id !== excludeSessionId).map((s) => [s.id, s]));
  // poslední trénink každého cviku
  const latest = new Map<string, string>();
  for (const x of sets) {
    const s = done.get(x.session_id);
    if (!s || x.archived || x.skipped) continue;
    const cur = latest.get(x.exercise_id);
    if (!cur || done.get(cur)!.started_at < s.started_at) latest.set(x.exercise_id, s.id);
  }
  const out = new Map<string, LastTime>();
  for (const x of sets) {
    if (x.archived || x.skipped || latest.get(x.exercise_id) !== x.session_id) continue;
    const prev = out.get(x.exercise_id);
    const better = !prev
      || (x.weight_kg ?? 0) > (prev.weightKg ?? 0)
      || ((x.weight_kg ?? 0) === (prev.weightKg ?? 0) && ((x.reps ?? 0) > (prev.reps ?? 0) || (x.time_s ?? 0) > (prev.timeS ?? 0)));
    if (better) out.set(x.exercise_id, { weightKg: x.weight_kg, reps: x.reps, timeS: x.time_s, at: done.get(x.session_id)!.started_at });
  }
  return out;
}

/** „30 kg × 10“, „10×“, „60 s“ */
export function lastText(l: LastTime): string {
  if (l.timeS != null && l.reps == null) return `${l.timeS} s`;
  const reps = l.reps != null ? `${l.reps}` : '';
  if (l.weightKg && l.weightKg > 0) return reps ? `${fmtKg(l.weightKg)} kg × ${reps}` : `${fmtKg(l.weightKg)} kg`;
  return reps ? `${reps}×` : '';
}

/** „+2,5 kg“ když je dnešní plán těžší než minule, jinak null. */
export function upText(l: LastTime, planKg: number | null): string | null {
  if (planKg == null || l.weightKg == null) return null;
  const d = Math.round((planKg - l.weightKg) * 100) / 100;
  return d > 0 ? `+${fmtKg(d)} kg` : null;
}
