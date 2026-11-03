import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { publishWeek } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    const ok = await publishWeek(await getDb(), user.id, String(body.clientId ?? ''), String(body.weekId ?? ''));
    return ok ? Response.json({ ok }) : Response.json({ error: 'not_found' }, { status: 404 });
  } catch (e) { return coachErrorResponse(e); }
}
