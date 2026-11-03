import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { listClients, myCoaches } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Moji klienti (trenér) a moji trenéři (cvičenec). */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  try {
    const db = await getDb();
    return Response.json({ clients: await listClients(db, user.id), coaches: await myCoaches(db, user.id) });
  } catch (e) { return coachErrorResponse(e); }
}
