import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { applyChanges } from '@/server/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.changes)) return Response.json({ error: 'bad_request' }, { status: 400 });
  try {
    return Response.json(await applyChanges(await getDb(), user.id, body.changes));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
