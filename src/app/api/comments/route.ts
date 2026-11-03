import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { coachErrorResponse } from '@/server/coach-routes';
import { addComment, listComments } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** E5: komentáře k datům jednoho cvičence (čte on a jeho trenér). */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const client = new URL(req.url).searchParams.get('client') || user.id;
  try { return Response.json({ comments: await listComments(await getDb(), user.id, client) }); } catch (e) { return coachErrorResponse(e); }
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  try {
    const id = await addComment(await getDb(), user.id, {
      id: typeof b.id === 'string' ? b.id : undefined, clientId: String(b.clientId || user.id),
      targetType: String(b.targetType ?? ''), targetId: String(b.targetId ?? ''), text: String(b.text ?? ''),
    });
    return Response.json({ id });
  } catch (e) { return coachErrorResponse(e); }
}
