import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { clientData } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E4: data klienta očima trenéra (plán včetně konceptů, tréninky, série, poznámky, měření). */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const id = new URL(req.url).searchParams.get('id') ?? '';
  try { return Response.json(await clientData(await getDb(), user.id, id)); } catch (e) { return coachErrorResponse(e); }
}
