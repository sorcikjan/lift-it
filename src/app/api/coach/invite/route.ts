import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { createInvite } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E2: pozvánka klienta odkazem (platí 14 dní, jen jednou). */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  try {
    const token = await createInvite(await getDb(), user.id);
    return Response.json({ token, url: `${new URL(req.url).origin}/pozvanka?token=${token}` });
  } catch (e) { return coachErrorResponse(e); }
}
