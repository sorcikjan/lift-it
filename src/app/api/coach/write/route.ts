import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { coachWrite } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E3: zápis plánu klientovi (idempotentní upsert, stejně jako synchronizace). */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try { return Response.json(await coachWrite(await getDb(), user.id, String(body.clientId ?? ''), body.changes ?? [])); } catch (e) { return coachErrorResponse(e); }
}
