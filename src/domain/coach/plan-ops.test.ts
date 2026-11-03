import { describe, expect, it } from 'vitest';
import { addDays, bumpWeights, copyWeek, latestWeek, replaceWorkout, weekStats, weekTree, type PlanRows } from './plan-ops';

let n = 0;
const id = () => `n${++n}`;
const rows = (): PlanRows => ({
  plan_weeks: [
    { id: 'w1', program_id: 'p', week_start: '2026-11-02', source: 'sheet', sheet_url: 'u', sheet_tab: 't', imported_at: null, raw_snapshot: [['x']], published: true, archived: false },
    { id: 'w0', program_id: 'p', week_start: '2026-10-26', source: 'paste', sheet_url: null, sheet_tab: null, imported_at: null, raw_snapshot: null, published: true, archived: false },
    { id: 'wb', program_id: 'p', week_start: '2026-12-01', source: 'baseline', sheet_url: null, sheet_tab: null, imported_at: null, raw_snapshot: null, published: true, archived: false },
  ],
  workouts: [
    { id: 'a', week_id: 'w1', label: 'A', position: 0, planned_date: '2026-11-03', note: null, archived: false },
    { id: 'b', week_id: 'w1', label: 'B', position: 1, planned_date: null, note: null, archived: false },
    { id: 'x', week_id: 'w1', label: 'C', position: 2, planned_date: null, note: null, archived: true },
  ],
  planned_exercises: [
    { id: 'pe1', workout_id: 'a', exercise_id: 'Leg_Press', position: 0, blok: 'hlavni', group_label: null, coach_note: 'kolena ven', source_name: 'Leg press', archived: false },
    { id: 'pe2', workout_id: 'a', exercise_id: 'Plank', position: 1, blok: 'zaver', group_label: null, coach_note: null, source_name: 'Plank', archived: false },
    { id: 'pe3', workout_id: 'b', exercise_id: 'Pushups', position: 0, blok: 'hlavni', group_label: null, coach_note: null, source_name: 'Kliky', archived: false },
  ],
  planned_sets: [
    { id: 's1', planned_exercise_id: 'pe1', number: 1, reps_min: 10, reps_max: 10, weight_kg: 40, time_s: null, kind: 'working', to_failure: false, archived: false },
    { id: 's2', planned_exercise_id: 'pe1', number: 2, reps_min: 10, reps_max: 10, weight_kg: 42.5, time_s: null, kind: 'working', to_failure: false, archived: false },
    { id: 's3', planned_exercise_id: 'pe2', number: 1, reps_min: null, reps_max: null, weight_kg: null, time_s: 30, kind: 'working', to_failure: false, archived: false },
    { id: 's4', planned_exercise_id: 'pe3', number: 1, reps_min: null, reps_max: null, weight_kg: null, time_s: null, kind: 'working', to_failure: true, archived: false },
  ],
});

describe('E3: editor plánu trenéra', () => {
  it('poslední týden k kopírování (bez historie)', () => expect(latestWeek(rows())?.id).toBe('w1'));

  it('kopie minulého týdne: o 7 dní dál, koncept, nová ID, stejný obsah', () => {
    const src = weekTree('w1', rows())!;
    expect(src.workouts.map((w) => w.label)).toEqual(['A', 'B']); // archivovaný C se nekopíruje
    const c = copyWeek(src, id, '2026-11-08T10:00:00Z');
    expect(c.week).toMatchObject({ week_start: '2026-11-09', published: false, source: 'app', sheet_url: null, raw_snapshot: null, program_id: 'p' });
    expect(c.workouts.map((w) => [w.label, w.planned_date, w.week_id])).toEqual([['A', '2026-11-10', c.week.id], ['B', null, c.week.id]]);
    expect(c.exercises.map((p) => [p.exercise_id, p.coach_note])).toEqual([['Leg_Press', 'kolena ven'], ['Plank', null], ['Pushups', null]]);
    expect(c.sets.map((s) => s.weight_kg)).toEqual([40, 42.5, null, null]);
    const all = [c.week.id, ...c.workouts.map((x) => x.id), ...c.exercises.map((x) => x.id), ...c.sets.map((x) => x.id)];
    expect(new Set(all).size).toBe(all.length);
    expect(all.some((x) => ['w1', 'a', 'b', 'pe1', 's1'].includes(x))).toBe(false);
    // série visí na nových cvicích
    const pe1 = c.exercises.find((p) => p.exercise_id === 'Leg_Press')!;
    expect(c.sets.filter((s) => s.planned_exercise_id === pe1.id)).toHaveLength(2);
  });

  it('+2,5 kg jen sériím s váhou', () => {
    const b = bumpWeights(weekTree('w1', rows())!);
    expect(b.map((s) => [s.id, s.weight_kg])).toEqual([['s1', 42.5], ['s2', 45]]);
  });

  it('úprava tréninku: staré archivuje, nové v pořadí', () => {
    const r = replaceWorkout(weekTree('w1', rows())!, 'a', [
      { exerciseId: 'Plank', blok: 'zaver', group: null, note: null, sourceName: null, sets: [{ repsMax: null, weightKg: null, timeS: 45 }] },
      { exerciseId: 'Barbell_Squat', blok: 'hlavni', group: null, note: 'hloubka', sourceName: null, sets: [{ repsMax: 5, weightKg: 60.1, timeS: null }, { repsMax: 5, weightKg: 60, timeS: null }] },
    ], id);
    expect(r.archived.planned_exercises.map((p) => [p.id, p.archived])).toEqual([['pe1', true], ['pe2', true]]);
    expect(r.archived.planned_sets.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
    expect(r.created.planned_exercises.map((p) => [p.exercise_id, p.position])).toEqual([['Plank', 0], ['Barbell_Squat', 1]]);
    expect(r.created.planned_sets.map((s) => [s.number, s.weight_kg, s.time_s])).toEqual([[1, null, 45], [1, 60, null], [2, 60, null]]);
  });

  it('E4: docházka po týdnech', () => {
    const st = weekStats(rows(), [{ workout_id: 'a', status: 'done', archived: false }, { workout_id: 'b', status: 'abandoned', archived: false }]);
    expect(st.map((s) => [s.weekStart, s.done, s.planned])).toEqual([['2026-11-02', 1, 2], ['2026-10-26', 0, 0]]);
  });

  it('datum + dny přes přelom měsíce', () => expect(addDays('2026-11-30', 7)).toBe('2026-12-07'));
});
