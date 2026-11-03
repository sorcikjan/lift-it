import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadToken } from '@/server/tokens';
import { stravaConfigured, type StravaToken } from '@/integrations/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const tok = await loadToken<StravaToken>(await getDb(), user.id, 'strava');
  return Response.json({ configured: stravaConfigured(), connected: !!tok, writeDescription: tok ? tok.write_description !== false : true });
}
