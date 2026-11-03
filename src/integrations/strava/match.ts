import type { StravaActivity } from './types';

/** Silové typy aktivit mají přednost před během apod. (G6: na hodinkách spouštět Silový trénink). */
const STRENGTH = new Set(['WeightTraining', 'Workout', 'Crossfit', 'HighIntensityIntervalTraining']);

/**
 * G2: aktivita ze Stravy k tréninku podle časového překryvu. Vyhraje největší překryv,
 * při shodě silová aktivita. Bez překryvu nic (tolerance 10 min na rozdílné hodiny a pozdní start).
 */
export function matchActivity(session: { started_at: string; ended_at: string | null }, activities: StravaActivity[], toleranceMin = 10): StravaActivity | null {
  const tol = toleranceMin * 60_000;
  const s0 = new Date(session.started_at).getTime() - tol;
  const s1 = (session.ended_at ? new Date(session.ended_at).getTime() : new Date(session.started_at).getTime() + 90 * 60_000) + tol;
  let best: { a: StravaActivity; overlap: number; strength: boolean } | null = null;
  for (const a of activities) {
    const a0 = new Date(a.start_date).getTime();
    const a1 = a0 + a.elapsed_time * 1000;
    const overlap = Math.min(s1, a1) - Math.max(s0, a0);
    if (overlap <= 0) continue;
    const strength = STRENGTH.has(a.sport_type);
    if (!best || overlap > best.overlap + 60_000 || (Math.abs(overlap - best.overlap) <= 60_000 && strength && !best.strength)) best = { a, overlap, strength };
  }
  return best?.a ?? null;
}

/** Okno pro dotaz na Stravu (Unix s): od 3 h před začátkem do 3 h po konci tréninku. */
export function searchWindow(session: { started_at: string; ended_at: string | null }): { after: number; before: number } {
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : start + 90 * 60_000;
  return { after: Math.floor((start - 3 * 3600_000) / 1000), before: Math.ceil((end + 3 * 3600_000) / 1000) };
}
