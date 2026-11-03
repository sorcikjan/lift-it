import { decrypt } from '@/server/crypto';
import { env } from '@/server/env';
import { getDb } from '@/server/db';
import { storeToken } from '@/server/tokens';
import { exchangeCode } from '@/integrations/strava/api';
import type { StravaToken } from '@/integrations/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** G1: návrat ze Stravy. Token se uloží šifrovaně (AES-256-GCM) a appka se vrátí na Účet. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const back = (ok: boolean) => Response.redirect(new URL(`/ucet?strava=${ok ? 'ok' : 'chyba'}`, u.origin), 303);
  const code = u.searchParams.get('code');
  const scope = u.searchParams.get('scope') ?? '';
  let uid: string;
  try {
    const st = decrypt<{ uid: string; exp: number }>(u.searchParams.get('state') ?? '');
    if (st.exp < Date.now()) return back(false);
    uid = st.uid;
  } catch { return back(false); }
  if (!code || u.searchParams.get('error') || !scope.includes('activity:read')) return back(false);
  try {
    const tok: StravaToken = env.mockIntegrations
      ? { access_token: 'mock', refresh_token: 'mock', expires_at: Math.floor(Date.now() / 1000) + 6 * 3600, athlete_id: 1 }
      : await exchangeCode(env.stravaClientId, env.stravaClientSecret, code);
    await storeToken(await getDb(), uid, 'strava', { ...tok, write_description: scope.includes('activity:write') });
    return back(true);
  } catch { return back(false); }
}
