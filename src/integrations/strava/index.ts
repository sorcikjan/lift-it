import type { Db } from '@/server/db/types';
import { env } from '@/server/env';
import { deleteToken, loadToken, storeToken } from '@/server/tokens';
import { refreshToken, stravaApi } from './api';
import { mockStrava } from './mock';
import { StravaError, type StravaClient, type StravaToken } from './types';

export * from './types';
export { matchActivity, searchWindow } from './match';
export { activityDescription } from './describe';

export const stravaConfigured = () => env.mockIntegrations || !!(env.stravaClientId && env.stravaClientSecret);

/** Platný token: když vyprší (Strava: 6 h), obnoví ho a uloží. */
export async function stravaToken(db: Db, uid: string, fetchImpl: typeof fetch = fetch): Promise<StravaToken> {
  const tok = await loadToken<StravaToken>(db, uid, 'strava');
  if (!tok) throw new StravaError('not_connected');
  if (env.mockIntegrations || tok.expires_at * 1000 > Date.now() + 60_000) return tok;
  try {
    const fresh = await refreshToken(env.stravaClientId, env.stravaClientSecret, tok.refresh_token, fetchImpl);
    const next = { ...tok, ...fresh, athlete_id: fresh.athlete_id ?? tok.athlete_id };
    await storeToken(db, uid, 'strava', next);
    return next;
  } catch (e) {
    if (e instanceof StravaError && e.code === 'auth') { await deleteToken(db, uid, 'strava'); throw new StravaError('not_connected'); }
    throw e;
  }
}

export async function stravaClient(db: Db, uid: string): Promise<{ client: StravaClient; token: StravaToken }> {
  const token = await stravaToken(db, uid);
  return { client: env.mockIntegrations ? mockStrava() : stravaApi(token.access_token), token };
}
