import { getUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { supabaseConfigured } from '@/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return Response.json({ user: null, auth: supabaseConfigured() ? 'supabase' : 'none' });
  const db = await getDb();
  const [profile] = await db.asUser(user.id, (tx) => tx.query(`select id, roles, name, email from profiles where id = $1`, [user.id]));
  return Response.json({ user: { ...user, ...(profile ?? {}) }, auth: user.dev ? 'dev' : 'supabase' });
}
