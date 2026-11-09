import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { stravaErrorResponse } from '@/server/strava-routes';
import { stravaClient } from '@/integrations/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Aktivity ze Stravy za posledních 14 dní, aby appka nabídla zapsat trénink s trenérem. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  try {
    const { client } = await stravaClient(await getDb(), user.id);
    const now = Math.floor(Date.now() / 1000);
    const list = await client.listActivities(now - 14 * 86400, now);
    return Response.json({
      activities: list.map((a) => ({
        id: a.id, name: a.name, sport_type: a.sport_type, start_date: a.start_date, elapsed_time: a.elapsed_time,
        average_heartrate: a.average_heartrate ?? null, max_heartrate: a.max_heartrate ?? null,
      })),
    });
  } catch (e) {
    return stravaErrorResponse(e);
  }
}
