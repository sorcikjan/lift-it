'use client';
import { baselineSession } from '@/domain/plan/baseline';
import { db } from './db';
import { localUserId, save, saveWeek, workoutView, type ResolvedWorkout } from './repo';
import { uuid } from './uuid';

/**
 * A8: starší týden se uloží jako týden se zdrojem „baseline“ (domov ho nenabízí)
 * a každý jeho trénink jako odcvičená Session se sériemi podle plánu.
 */
export async function saveBaselineWeek(workouts: ResolvedWorkout[], weekStart: string, raw: unknown): Promise<string> {
  const weekId = await saveWeek({ workouts, weekStart, source: 'baseline', raw });
  const wos = (await db().workouts.where('week_id').equals(weekId).toArray()).sort((a, b) => a.position - b.position);
  const userId = await localUserId();
  for (const [i, wo] of wos.entries()) {
    const plan = await workoutView(wo.id);
    if (!plan) continue;
    const { session, sets } = baselineSession(plan, weekStart, i, userId, uuid);
    await save('sessions', [session as unknown as { id: string }]);
    await save('logged_sets', sets as unknown as { id: string }[]);
  }
  return weekId;
}
