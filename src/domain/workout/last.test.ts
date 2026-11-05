import { describe, expect, it } from 'vitest';
import { lastText, lastTimes, upText } from './last';
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
