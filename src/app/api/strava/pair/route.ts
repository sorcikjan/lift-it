import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { stravaErrorResponse } from '@/server/strava-routes';
import { activityDescription, matchActivity, searchWindow, stravaClient } from '@/integrations/strava';
import { t } from '@/i18n/t';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * G2–G4: najde ve Stravě aktivitu k tréninku, vrátí tep, kalorie a délku
 * a (pokud to uživatel nevypnul) zapíše odcvičené série do popisu aktivity.
 * Klient si výsledek uloží do Session a ta se synchronizuje běžnou cestou.
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const s = body.session as { started_at?: string; ended_at?: string | null } | undefined;
  if (!s?.started_at || Number.isNaN(Date.parse(s.started_at))) return Response.json({ error: 'bad_request' }, { status: 400 });
  const session = { started_at: s.started_at, ended_at: s.ended_at ?? null };
  const lines = Array.isArray(body.lines) ? (body.lines as unknown[]).map(String).slice(0, 60) : [];
  try {
    const { client, token } = await stravaClient(await getDb(), user.id);
    const w = searchWindow(session);
    const found = matchActivity(session, await client.listActivities(w.after, w.before));
    if (!found) return Response.json({ status: 'not_found' });
    const detail = await client.getActivity(found.id);
    let described = false;
    if (token.write_description !== false && lines.length) {
      const next = activityDescription(detail.description, t('strava.popisNadpis'), lines);
      if (next !== (detail.description ?? '')) await client.updateDescription(found.id, next);
      described = true;
    }
    return Response.json({
      status: 'paired',
      activityId: found.id,
      hr_avg: detail.average_heartrate != null ? Math.round(detail.average_heartrate) : null,
      hr_max: detail.max_heartrate != null ? Math.round(detail.max_heartrate) : null,
      kcal: detail.calories != null ? Math.round(detail.calories) : null,
      elapsed_s: detail.elapsed_time,
      described,
    });
  } catch (e) {
    return stravaErrorResponse(e);
  }
}
