import { StravaError } from '@/integrations/strava';

export function stravaErrorResponse(e: unknown) {
  const code = e instanceof StravaError ? e.code : 'unavailable';
  const status = code === 'not_connected' || code === 'auth' ? 409 : code === 'rate_limited' ? 429 : 502;
  return Response.json({ error: code }, { status });
}
