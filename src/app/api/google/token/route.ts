import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { storeToken } from '@/server/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Po přihlášení Googlem uloží obnovovací token šifrovaně na server (offline access pro import). */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  if (typeof body.refresh_token !== 'string' && typeof body.access_token !== 'string') return Response.json({ error: 'bad_request' }, { status: 400 });
  await storeToken(await getDb(), user.id, 'google', {
    refresh_token: body.refresh_token ?? undefined,
    access_token: body.access_token ?? undefined,
    expires_at: body.access_token ? Date.now() + 50 * 60_000 : undefined,
  });
  return Response.json({ ok: true });
}
