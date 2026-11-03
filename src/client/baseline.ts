'use client';
import type { ResolvedWorkout } from './repo';

/** Import starších týdnů jako historie (A8) přijde ve fázi 3. */
export async function saveBaselineWeek(_w: ResolvedWorkout[], _weekStart: string, _raw: unknown): Promise<void> {
  throw new Error('not_implemented');
}
