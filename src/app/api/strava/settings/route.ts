import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { loadToken, storeToken } from '@/server/tokens';
import type { StravaToken } from '@/integrations/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** G4: zápis sérií do popisu aktivity jde vypnout. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const db = await getDb();
  const tok = await loadToken<StravaToken>(db, user.id, 'strava');
  if (!tok) return Response.json({ error: 'not_connected' }, { status: 409 });
  await storeToken(db, user.id, 'strava', { ...tok, write_description: !!body.writeDescription });
  return Response.json({ ok: true });
}
