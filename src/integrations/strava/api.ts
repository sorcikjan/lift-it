import { StravaError, type StravaActivity, type StravaClient, type StravaToken } from './types';

const API = 'https://www.strava.com/api/v3';
export const STRAVA_SCOPE = 'read,activity:read_all,activity:write';

async function check(res: Response) {
  if (res.status === 401) throw new StravaError('auth');
  if (res.status === 429) throw new StravaError('rate_limited');
  if (!res.ok) throw new StravaError('unavailable', `HTTP ${res.status}`);
  return res;
}

/** Strava API v3 pod tokenem uživatele. */
export function stravaApi(accessToken: string, fetchImpl: typeof fetch = fetch): StravaClient {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return {
    async listActivities(after, before) {
      const res = await check(await fetchImpl(`${API}/athlete/activities?after=${after}&before=${before}&per_page=30`, { headers }));
      return res.json();
    },
    async getActivity(id) {
      return (await check(await fetchImpl(`${API}/activities/${id}`, { headers }))).json();
    },
    async updateDescription(id, description) {
      await check(await fetchImpl(`${API}/activities/${id}`, {
        method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ description }),
      }));
    },
  };
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', approval_prompt: 'auto', scope: STRAVA_SCOPE, state });
  return `https://www.strava.com/oauth/authorize?${q}`;
}

async function tokenRequest(body: Record<string, string>, fetchImpl: typeof fetch): Promise<StravaToken> {
  const res = await check(await fetchImpl('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
  }).then((r) => (r.status === 400 ? new Response('', { status: 401 }) : r)));
  const j = await res.json();
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, athlete_id: j.athlete?.id };
}

export function exchangeCode(clientId: string, clientSecret: string, code: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }, fetchImpl);
}

export function refreshToken(clientId: string, clientSecret: string, refresh: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest({ client_id: clientId, client_secret: clientSecret, refresh_token: refresh, grant_type: 'refresh_token' }, fetchImpl);
}

export async function deauthorize(accessToken: string, fetchImpl: typeof fetch = fetch) {
  await fetchImpl('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
}
