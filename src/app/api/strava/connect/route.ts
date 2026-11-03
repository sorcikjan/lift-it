import { getUser, unauthorized } from '@/server/auth';
import { encrypt } from '@/server/crypto';
import { env } from '@/server/env';
import { stravaConfigured } from '@/integrations/strava';
import { authorizeUrl } from '@/integrations/strava/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** G1: odkaz na souhlas ve Stravě. Uživatele nese šifrovaný state (platí 15 min), takže callback nepotřebuje cookie. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  if (!stravaConfigured()) return Response.json({ error: 'not_configured' }, { status: 503 });
  const state = encrypt({ uid: user.id, exp: Date.now() + 15 * 60_000 });
  const origin = new URL(req.url).origin;
  const redirect = `${origin}/api/strava/callback`;
  const url = env.mockIntegrations
    ? `${redirect}?code=mock&scope=read,activity:read_all,activity:write&state=${encodeURIComponent(state)}`
    : authorizeUrl(env.stravaClientId, redirect, state);
  return Response.json({ url });
}
