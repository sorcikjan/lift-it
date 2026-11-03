import { describe, expect, it } from 'vitest';
import { attendance, changeFromStart, e1rm, exerciseHistory, recordHistory, summarize, type SetLike } from './progress';

const sess = (id: string, date: string) => ({ id, started_at: date, ended_at: null, status: 'done' as const, archived: false });
const set = (session_id: string, weight_kg: number | null, reps: number | null, extra: Partial<SetLike> = {}): SetLike => ({
  exercise_id: 'leg', session_id, weight_kg, reps, time_s: null, kind: 'working', skipped: false, archived: false, logged_at: '2026-01-01T00:00:00Z', ...extra,
});

describe('D1: odhad 1RM (Epley)', () => {
  it('váha × (1 + opakování / 30)', () => expect(e1rm(45, 10)).toBeCloseTo(60));
  it('jen pro 1–12 opakování', () => {
    expect(e1rm(40, 13)).toBeNull();
    expect(e1rm(40, 0)).toBeNull();
    expect(e1rm(null, 10)).toBeNull();
  });
});

describe('D1/D2: historie cviku a změna od začátku', () => {
  const sessions = [sess('s1', '2026-10-07T18:00:00Z'), sess('s2', '2026-10-14T18:00:00Z'), sess('s3', '2026-11-03T18:00:00Z')];
  const sets = [
    set('s1', 30, 10), set('s1', 30, 10), set('s1', 20, 12, { kind: 'warmup' }),
    set('s2', 40, 10), set('s2', 40, 8),
    set('s3', 45, 10), set('s3', 50, 3, { archived: true }),
  ];
  const h = exerciseHistory('leg', sets, sessions);
  it('max. pracovní váha bez rozcvičky a archivovaných', () => {
    expect(h.map((x) => x.maxWeight)).toEqual([30, 40, 45]);
  });
  it('objem = Σ váha × opakování', () => expect(h[1].volume).toBe(40 * 10 + 40 * 8));
  it('změna od začátku: (60 − 40) / 40 = +50 %', () => expect(changeFromStart(h)).toBeCloseTo(0.5));
  it('jeden trénink = 0 %, žádný = null', () => {
    expect(changeFromStart(h.slice(0, 1))).toBe(0);
    expect(changeFromStart([])).toBeNull();
  });
  it('plank podle času', () => {
    const p = exerciseHistory('plank', [
      { ...set('s1', null, null), exercise_id: 'plank', time_s: 30 },
      { ...set('s3', null, null), exercise_id: 'plank', time_s: 45 },
    ], sessions);
    expect(changeFromStart(p)).toBeCloseTo(0.5);
  });
});

describe('D3: osobní rekordy', () => {
  const sessions = [sess('s1', '2026-10-07T18:00:00Z'), sess('s2', '2026-10-14T18:00:00Z'), sess('s3', '2026-10-21T18:00:00Z')];
  it('první trénink je výchozí stav, ne rekord', () => {
    expect(recordHistory([set('s1', 30, 10)], sessions)).toEqual([]);
  });
  it('vyšší váha, vyšší odhad maxima i víc opakování při stejné váze', () => {
    const r = recordHistory([set('s1', 40, 8), set('s2', 42.5, 10), set('s3', 42.5, 12)], sessions);
    expect(r.filter((x) => x.sessionId === 's2').map((x) => x.type).sort()).toEqual(['e1rm', 'weight']);
    const s3 = r.filter((x) => x.sessionId === 's3');
    expect(s3.map((x) => x.type).sort()).toEqual(['e1rm', 'reps']);
    expect(s3.find((x) => x.type === 'reps')).toMatchObject({ value: 12, previous: 10, weight: 42.5 });
  });
  it('v jednom tréninku jeden rekord za typ, s nejlepší hodnotou', () => {
    const r = recordHistory([set('s1', 40, 10), set('s2', 42.5, 10), set('s2', 45, 10)], sessions);
    const w = r.filter((x) => x.type === 'weight');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ value: 45, previous: 40 });
  });
});

describe('B12: shrnutí tréninku', () => {
  it('délka, objem a splnění plánu', () => {
    const s = { id: 's1', started_at: '2026-11-03T18:00:00Z', ended_at: '2026-11-03T18:52:00Z', status: 'done' as const, archived: false };
    const r = summarize(s, [set('s1', 40, 10), set('s1', 45, 10), set('s1', 40, 10, { archived: true })], 28);
    expect(r).toEqual({ durationMin: 52, volume: 850, loggedSets: 2, plannedSets: 28 });
  });
});

describe('D4: docházka', () => {
  it('tréninky za týden vs. plán', () => {
    const r = attendance([sess('a', '2026-11-03T18:00:00'), sess('b', '2026-11-05T18:00:00'), sess('c', '2026-11-10T18:00:00')],
      [{ week_start: '2026-11-02', planned: 2 }, { week_start: '2026-11-09', planned: 2 }]);
    expect(r.map((x) => x.done)).toEqual([2, 1]);
  });
});
