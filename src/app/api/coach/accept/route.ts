import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { acceptInvite } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const { token } = await req.json().catch(() => ({}));
  try { return Response.json({ coach: await acceptInvite(await getDb(), user.id, String(token ?? '')) }); } catch (e) { return coachErrorResponse(e); }
}
