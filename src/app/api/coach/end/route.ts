import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { endCoaching } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try { await endCoaching(await getDb(), user.id, String(body.userId ?? '')); return Response.json({ ok: true }); } catch (e) { return coachErrorResponse(e); }
}
