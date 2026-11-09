import { describe, expect, it } from 'vitest';
import { strayActivities, unpaid } from './coach-session';
import type { Session } from './types';
import type { StravaActivity } from '@/integrations/strava/types';

const act = (id: number, start: string, sport = 'WeightTraining'): StravaActivity => ({ id, name: 'Silový trénink', sport_type: sport, start_date: start, elapsed_time: 3600 });
const sess = (p: Partial<Session>): Session => ({
  id: p.id ?? 's', user_id: 'u', workout_id: null, started_at: '2026-11-08T16:00:00Z', ended_at: '2026-11-08T17:00:00Z', with_coach: false, note: null,
  status: 'done', actual_order: [], source: 'app', strava_activity_id: null, pairing_status: null, hr_avg: null, hr_max: null, kcal: null,
  garmin_activity_id: null, archived: false, ...p,
});

describe('strayActivities', () => {
  it('nabídne jen silovou aktivitu bez tréninku v appce, nejnovější první', () => {
    const a = [act(1, '2026-11-08T16:05:00Z'), act(2, '2026-11-06T10:00:00Z'), act(3, '2026-11-07T10:00:00Z'), act(4, '2026-11-05T10:00:00Z', 'Run')];
    const r = strayActivities(a, [sess({})], []);
    expect(r.map((x) => x.id)).toEqual([3, 2]);
  });
  it('vynechá spárovanou a odmítnutou aktivitu', () => {
    const a = [act(1, '2026-11-01T10:00:00Z'), act(2, '2026-11-02T10:00:00Z')];
    expect(strayActivities(a, [sess({ started_at: '2026-10-01T10:00:00Z', ended_at: null, strava_activity_id: 1 })], [2])).toEqual([]);
  });
  it('smazaný trénink aktivitu znovu uvolní', () => {
    const a = [act(1, '2026-11-08T16:05:00Z')];
    expect(strayActivities(a, [sess({ archived: true, strava_activity_id: 1 })], [])).toHaveLength(1);
  });
});

describe('unpaid', () => {
  it('jen nezaplacené tréninky s trenérem, od nejstaršího', () => {
    const r = unpaid([
      sess({ id: 'a', source: 'coach', paid: false, started_at: '2026-11-08T10:00:00Z' }),
      sess({ id: 'b', source: 'coach', paid: true }),
      sess({ id: 'c', source: 'coach', paid: false, started_at: '2026-11-05T10:00:00Z' }),
      sess({ id: 'd', source: 'coach', paid: false, archived: true }),
      sess({ id: 'e', source: 'app' }),
    ]);
    expect(r.map((s) => s.id)).toEqual(['c', 'a']);
  });
});
