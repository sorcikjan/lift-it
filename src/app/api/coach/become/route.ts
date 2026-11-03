import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { becomeCoach } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E2: „Jsem trenér“. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  try { await becomeCoach(await getDb(), user.id); return Response.json({ ok: true }); } catch (e) { return coachErrorResponse(e); }
}
