import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { saveSubscription } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E6: uloží odběr upozornění tohoto zařízení. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  try { await saveSubscription(await getDb(), user.id, b); return Response.json({ ok: true }); } catch (e) { return coachErrorResponse(e); }
}
