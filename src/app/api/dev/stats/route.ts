import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { devAuthAllowed } from '@/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jen pro vývoj a e2e testy: kolik řádků má uživatel v databázi. V produkci 404. */
export async function GET(req: Request) {
  if (!devAuthAllowed()) return new Response('not found', { status: 404 });
  const user = await getUser(req);
  if (!user) return unauthorized();
  const db = await getDb();
  const [r] = await db.asUser(user.id, (tx) => tx.query(
    `select (select count(*)::int from logged_sets where not archived) as sets,
            (select count(distinct id)::int from logged_sets where not archived) as distinct_sets,
            (select count(*)::int from sessions) as sessions,
            (select count(*)::int from planned_sets) as planned_sets`,
  ));
  return Response.json(r);
}
