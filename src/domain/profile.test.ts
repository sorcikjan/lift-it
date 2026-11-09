import { describe, expect, it } from 'vitest';
import { profileSummary, strengthTrend } from './profile';
import type { LoggedSet, Session } from './types';

const s = (id: string, at: string, extra: Partial<Session> = {}) => ({ id, started_at: at, status: 'done', archived: false, source: 'app', ...extra }) as Session;
const set = (session_id: string, extra: Partial<LoggedSet> = {}) => ({ session_id, archived: false, skipped: false, ...extra }) as LoggedSet;

describe('Profil', () => {
  const now = new Date(2026, 10, 6, 12); // čtvrtek 6. 11. 2026
  const sessions = [s('a', new Date(2026, 10, 2, 18).toISOString()), s('b', new Date(2026, 10, 4, 18).toISOString()),
    s('c', new Date(2026, 9, 28, 18).toISOString()), s('d', new Date(2026, 10, 5, 18).toISOString(), { status: 'active' }),
    s('e', new Date(2026, 9, 1).toISOString(), { source: 'baseline' })];
  const sets = [set('a'), set('a'), set('b'), set('b', { archived: true }), set('c', { skipped: true }), set('d')];
  const p = profileSummary(sessions, sets, now);
  it('počítá jen odcvičené tréninky z appky a jejich série', () => {
    expect([p.workouts, p.sets]).toEqual([3, 3]);
    expect(p.since).toBe(sessions[2].started_at);
  });
  it('týden po–ne: pondělí a středa', () => {
    expect(p.week).toEqual([true, false, true, false, false, false, false]);
    expect(p.thisWeek).toBe(2);
  });
});

describe('strengthTrend', () => {
  const ses = (id: string, at: string) => ({ id, user_id: 'u', workout_id: null, started_at: at, ended_at: at, with_coach: false, note: null, status: 'done' as const, actual_order: [], source: 'app' as const, strava_activity_id: null, pairing_status: null, hr_avg: null, hr_max: null, kcal: null, garmin_activity_id: null, archived: false });
  const st = (id: string, session_id: string, exercise_id: string, weight_kg: number, reps: number) => ({ id, session_id, exercise_id, planned_set_id: null, planned_exercise_id: null, number: 1, reps, weight_kg, time_s: null, rpe: null, skipped: false, extra: false, kind: 'working' as const, logged_at: '2026-11-01T10:00:00Z', archived: false });
  it('průměrná změna síly u cviků odcvičených aspoň dvakrát', () => {
    const sessions = [ses('a', '2026-11-02T10:00:00Z'), ses('b', '2026-11-09T10:00:00Z')];
    const sets = [st('1', 'a', 'x', 30, 10), st('2', 'b', 'x', 33, 10), st('3', 'a', 'y', 50, 8), st('4', 'b', 'y', 50, 8), st('5', 'b', 'z', 10, 10)];
    const r = strengthTrend(sessions, sets)!;
    expect(r.total).toBe(2);
    expect(r.up).toBe(1);
    expect(r.down).toBe(0);
    expect(r.change).toBeCloseTo(0.05, 3);
    expect(r.since).toBe('2026-11-02T10:00:00Z');
  });
  it('málo dat = null', () => expect(strengthTrend([ses('a', '2026-11-02T10:00:00Z')], [st('1', 'a', 'x', 30, 10)])).toBeNull());
});
