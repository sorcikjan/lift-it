/**
 * A8: starší týden z trenérova sheetu jako odcvičená historie.
 * Čistá funkce: z naplánovaného tréninku udělá uzavřenou Session (source 'baseline') a série podle plánu.
 */
import type { LoggedSet, Session, WorkoutView } from '../types';

/** Den v týdnu pro n-tý trénink: A pondělí, B středa, C pátek… (týden má 7 dní, víc se nevejde). */
export function baselineDate(weekStart: string, index: number): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.min(index * 2, 6));
  return d.toISOString();
}

export function baselineSession(plan: WorkoutView, weekStart: string, index: number, userId: string, newId: () => string): { session: Session; sets: LoggedSet[] } {
  const started = baselineDate(weekStart, index);
  const ended = new Date(new Date(started).getTime() + 60 * 60_000).toISOString();
  const session: Session = {
    id: newId(), user_id: userId, workout_id: plan.workoutId, started_at: started, ended_at: ended, with_coach: false, note: null,
    status: 'done', actual_order: plan.exercises.map((e) => e.id), source: 'baseline',
    strava_activity_id: null, pairing_status: null, hr_avg: null, hr_max: null, kcal: null, garmin_activity_id: null, archived: false,
  };
  const sets: LoggedSet[] = plan.exercises.flatMap((e) => e.sets.map((s) => ({
    id: newId(), session_id: session.id, exercise_id: e.exerciseId, planned_set_id: s.id, planned_exercise_id: e.id,
    number: s.number, reps: s.toFailure && s.repsMax == null ? null : s.repsMax ?? s.repsMin, weight_kg: s.weightKg, time_s: s.timeS,
    rpe: null, skipped: false, extra: false, kind: s.kind, logged_at: ended, archived: false,
  })));
  return { session, sets };
}
