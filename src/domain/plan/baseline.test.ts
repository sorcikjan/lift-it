import { describe, expect, it } from 'vitest';
import { baselineDate, baselineSession } from './baseline';
import { sampleWorkoutView } from '../workout/fixture';
import { exerciseHistory, changeFromStart } from '../progress';

let n = 0;
const id = () => `id-${++n}`;

describe('A8: starší týden jako historie', () => {
  it('tréninky týdne rozloží na pondělí, středu, pátek', () => {
    expect(baselineDate('2026-09-07', 0).slice(0, 10)).toBe('2026-09-07');
    expect(baselineDate('2026-09-07', 1).slice(0, 10)).toBe('2026-09-09');
    expect(baselineDate('2026-09-07', 5).slice(0, 10)).toBe('2026-09-13');
  });

  it('udělá uzavřenou Session se sériemi podle plánu', () => {
    const plan = sampleWorkoutView();
    const { session, sets } = baselineSession(plan, '2026-09-07', 0, 'u1', id);
    expect(session).toMatchObject({ status: 'done', source: 'baseline', user_id: 'u1', workout_id: 'sample-a' });
    expect(new Date(session.ended_at!).getTime()).toBeGreaterThan(new Date(session.started_at).getTime());
    expect(sets).toHaveLength(plan.exercises.reduce((a, e) => a + e.sets.length, 0));
    const leg = plan.exercises.find((e) => e.name === 'Leg press')!;
    expect(sets.filter((s) => s.exercise_id === leg.exerciseId).map((s) => [s.reps, s.weight_kg])).toEqual(leg.sets.map((s) => [s.repsMax, s.weightKg]));
    expect(new Set(sets.map((s) => s.id)).size).toBe(sets.length);
  });

  it('progres pak počítá od historie', () => {
    const plan = sampleWorkoutView();
    const old = baselineSession({ ...plan, exercises: plan.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, weightKg: s.weightKg == null ? null : s.weightKg - 10 })) })) }, '2026-09-07', 0, 'u1', id);
    const now = baselineSession(plan, '2026-11-02', 0, 'u1', id);
    now.session.source = 'app';
    const leg = plan.exercises.find((e) => e.name === 'Leg press')!;
    const h = exerciseHistory(leg.exerciseId, [...old.sets, ...now.sets], [old.session, now.session]);
    expect(h).toHaveLength(2);
    expect(changeFromStart(h)).toBeGreaterThan(0);
  });
});
