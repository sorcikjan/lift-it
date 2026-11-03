import { fmtKg, fmtNum } from './format';
import type { ExerciseSessionStat } from './progress';

export const pct = (c: number) => `${c >= 0 ? '+' : '−'}${fmtNum(Math.abs(c * 100), 0)} %`;

/** „45 kg × 10“, „30 s“, „12×“ */
export function bestText(h: Pick<ExerciseSessionStat, 'bestSet'> | undefined) {
  const b = h?.bestSet;
  if (!b) return '–';
  if (b.time != null && b.weight == null && b.reps == null) return `${b.time} s`;
  return b.weight ? `${fmtKg(b.weight)} kg × ${b.reps ?? ''}` : `${b.reps ?? ''}×`;
}
