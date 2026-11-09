/**
 * Co je v tréninku nového oproti minulému týdnu (domov): trenér posílá stejný trénink
 * s vyššími vahami nebo jiným cvikem. Srovnává se plán s plánem stejného tréninku (A, B…)
 * z minulého týdne; když minulý týden není, s tím, co jsem minule odcvičil.
 */
import { lastText, planDelta, type LastTime } from './last';
import type { WorkoutExerciseView } from '../types';

export interface ExerciseChange { dir: 'up' | 'down' | 'same' | 'new'; text: string | null; was: string | null }
export interface WeekDiff { basis: 'week' | 'last' | null; changes: Map<string, ExerciseChange> }

/** Nejtěžší pracovní série plánu jako „minule“. */
function topOf(e: WorkoutExerciseView): LastTime | undefined {
  const work = e.sets.filter((s) => s.kind !== 'warmup');
  const top = [...work].sort((a, b) => ((b.weightKg ?? 0) - (a.weightKg ?? 0)) || ((b.repsMax ?? 0) - (a.repsMax ?? 0)) || ((b.timeS ?? 0) - (a.timeS ?? 0)))[0];
  return top ? { weightKg: top.weightKg, reps: top.repsMax, timeS: top.repsMax == null ? top.timeS : null, at: '' } : undefined;
}

export function weekDiff(cur: WorkoutExerciseView[], prev: WorkoutExerciseView[] | null, last: Map<string, LastTime>): WeekDiff {
  const changes = new Map<string, ExerciseChange>();
  if (prev?.length) {
    for (const e of cur) {
      const p = prev.find((x) => x.exerciseId === e.exerciseId);
      if (!p) { changes.set(e.id, { dir: 'new', text: null, was: null }); continue; }
      const before = topOf(p);
      const d = planDelta(e.sets, before);
      if (d) changes.set(e.id, { ...d, was: before ? lastText(before) : null });
    }
    return { basis: 'week', changes };
  }
  for (const e of cur) {
    const l = last.get(e.exerciseId);
    const d = planDelta(e.sets, l);
    if (d) changes.set(e.id, { ...d, was: l ? lastText(l) : null });
  }
  return { basis: changes.size ? 'last' : null, changes };
}
