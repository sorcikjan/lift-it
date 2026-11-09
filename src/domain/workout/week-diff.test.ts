import { describe, expect, it } from 'vitest';
import { weekDiff } from './week-diff';
import type { WorkoutExerciseView } from '../types';

const ex = (id: string, exerciseId: string, weightKg: number | null, repsMax: number | null, timeS: number | null = null): WorkoutExerciseView => ({
  id, exerciseId, name: exerciseId, type: timeS ? 'time' : 'weight_reps', blok: 'hlavni', group: null, images: [], steps: [], coachNote: null,
  sets: [1, 2, 3].map((n) => ({ id: `${id}-${n}`, number: n, repsMin: repsMax, repsMax, weightKg, timeS, kind: 'working' as const, toFailure: false })),
});

describe('weekDiff', () => {
  it('proti minulému týdnu: těžší, víc opakování, beze změny, nový cvik', () => {
    const prev = [ex('p1', 'tlak', 32.5, 8), ex('p2', 'leg', 40, 10), ex('p3', 'plank', null, null, 30)];
    const cur = [ex('c1', 'tlak', 35, 8), ex('c2', 'leg', 40, 12), ex('c3', 'plank', null, null, 30), ex('c4', 'drep', 20, 10)];
    const r = weekDiff(cur, prev, new Map());
    expect(r.basis).toBe('week');
    expect(r.changes.get('c1')).toEqual({ dir: 'up', text: '+2,5 kg', was: '32,5 kg × 8' });
    expect(r.changes.get('c2')).toEqual({ dir: 'up', text: '+2 opak.', was: '40 kg × 10' });
    expect(r.changes.get('c3')).toEqual({ dir: 'same', text: null, was: '30 s' });
    expect(r.changes.get('c4')).toEqual({ dir: 'new', text: null, was: null });
  });
  it('bez minulého týdne proti odcvičenému, bez historie nic', () => {
    const cur = [ex('c1', 'tlak', 35, 8), ex('c2', 'leg', 40, 10)];
    const r = weekDiff(cur, null, new Map([['tlak', { weightKg: 30, reps: 8, timeS: null, at: 'x' }]]));
    expect(r.basis).toBe('last');
    expect(r.changes.get('c1')).toEqual({ dir: 'up', text: '+5 kg', was: '30 kg × 8' });
    expect(r.changes.has('c2')).toBe(false);
    expect(weekDiff(cur, null, new Map()).basis).toBeNull();
  });
});
