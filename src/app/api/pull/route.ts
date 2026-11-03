import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { pullAll } from '@/server/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  return Response.json(await pullAll(await getDb(), user.id));
}
