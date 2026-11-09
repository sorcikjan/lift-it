/**
 * Trénink s trenérem (11/2026): s trenérem se cvičí podle něj na místě, ne podle plánu v appce.
 * Appka si ho jen zapíše (ze Stravy nebo ručně) a hlídá, jestli je zaplacený.
 */
import { matchActivity } from '@/integrations/strava/match';
import type { StravaActivity } from '@/integrations/strava/types';
import type { Session } from './types';

const STRENGTH = new Set(['WeightTraining', 'Workout', 'Crossfit', 'HighIntensityIntervalTraining']);

/** Silové aktivity ze Stravy, ke kterým v appce není žádný trénink a které uživatel neodmítl. Nejnovější první. */
export function strayActivities(activities: StravaActivity[], sessions: Session[], dismissed: number[]): StravaActivity[] {
  const live = sessions.filter((s) => !s.archived && s.status !== 'abandoned');
  const paired = new Set(live.map((s) => s.strava_activity_id).filter((x) => x != null));
  return activities
    .filter((a) => STRENGTH.has(a.sport_type) && !paired.has(a.id) && !dismissed.includes(a.id))
    .filter((a) => !live.some((s) => matchActivity(s, [a])))
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
}

/** Nezaplacené tréninky s trenérem, od nejstaršího. */
export function unpaid(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.source === 'coach' && s.status === 'done' && !s.archived && s.paid === false)
    .sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
}
