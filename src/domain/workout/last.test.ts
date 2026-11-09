import { describe, expect, it } from 'vitest';
import { lastText, lastTimes, upText, planDelta } from './last';
import type { LoggedSet, Session } from '../types';

const ses = (id: string, at: string, status: Session['status'] = 'done') =>
  ({ id, started_at: at, status, archived: false }) as Session;
const set = (session_id: string, exercise_id: string, weight_kg: number | null, reps: number | null, extra: Partial<LoggedSet> = {}) =>
  ({ id: Math.random().toString(), session_id, exercise_id, weight_kg, reps, time_s: null, archived: false, skipped: false, ...extra }) as LoggedSet;

describe('Minule (nový design)', () => {
  const sessions = [ses('s1', '2026-10-28T17:00:00Z'), ses('s2', '2026-11-04T17:00:00Z'), ses('now', '2026-11-06T17:00:00Z', 'active')];
  const sets = [
    set('s1', 'lat', 27.5, 10), set('s2', 'lat', 30, 10), set('s2', 'lat', 30, 8), set('s2', 'lat', 25, 12),
    set('s1', 'plank', null, null, { time_s: 45 }),
    set('now', 'lat', 32.5, 10),
    set('s2', 'row', 50, 10, { skipped: true }), set('s2', 'row', 45, 10),
  ];
  const m = lastTimes(sets, sessions, 'now');

  it('bere poslední odcvičený trénink a v něm nejtěžší sérii', () => {
    expect(m.get('lat')).toMatchObject({ weightKg: 30, reps: 10 });
  });
  it('běžící trénink a vynechané série se nepočítají', () => {
    expect(m.get('row')).toMatchObject({ weightKg: 45 });
  });
  it('texty: váha × opakování, čas, plus proti plánu', () => {
    expect(lastText(m.get('lat')!)).toBe('30 kg × 10');
    expect(lastText(m.get('plank')!)).toBe('45 s');
    expect(upText(m.get('lat')!, 32.5)).toBe('+2,5 kg');
    expect(upText(m.get('lat')!, 30)).toBeNull();
    expect(m.has('nic')).toBe(false);
  });
});

describe('planDelta', () => {
  const set = (weightKg: number | null, repsMax: number | null, timeS: number | null = null, kind = 'working') => ({ weightKg, repsMax, timeS, kind });
  const last = (weightKg: number | null, reps: number | null, timeS: number | null = null) => ({ weightKg, reps, timeS, at: '2026-11-02T10:00:00Z' });
  it('těžší váha', () => expect(planDelta([set(32.5, 10), set(35, 8)], last(30, 10))).toEqual({ dir: 'up', text: '+5 kg' }));
  it('stejná váha, víc opakování', () => expect(planDelta([set(30, 12)], last(30, 10))).toEqual({ dir: 'up', text: '+2 opak.' }));
  it('lehčí váha', () => expect(planDelta([set(27.5, 10)], last(30, 10))).toEqual({ dir: 'down', text: '−2,5 kg' }));
  it('beze změny', () => expect(planDelta([set(30, 10)], last(30, 10))).toEqual({ dir: 'same', text: null }));
  it('čas', () => expect(planDelta([set(null, null, 60)], last(null, null, 45))).toEqual({ dir: 'up', text: '+15 s' }));
  it('vlastní váha: opakování', () => expect(planDelta([set(null, 15)], last(null, 12))).toEqual({ dir: 'up', text: '+3 opak.' }));
  it('rozcvičení se nepočítá a bez minula nic', () => {
    expect(planDelta([set(50, 5, null, 'warmup'), set(30, 10)], last(30, 10))).toEqual({ dir: 'same', text: null });
    expect(planDelta([set(30, 10)], undefined)).toBeNull();
  });
});
