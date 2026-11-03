import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { env } from '@/server/env';
import { deleteToken, loadToken } from '@/server/tokens';
import { deauthorize } from '@/integrations/strava/api';
import type { StravaToken } from '@/integrations/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const db = await getDb();
  const tok = await loadToken<StravaToken>(db, user.id, 'strava');
  if (tok && !env.mockIntegrations) await deauthorize(tok.access_token);
  await deleteToken(db, user.id, 'strava');
  return Response.json({ ok: true });
}
