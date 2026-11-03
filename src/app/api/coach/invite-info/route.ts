import { getDb } from '@/server/db';
import { inviteInfo } from '@/server/coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jméno trenéra na stránce pozvánky (i bez přihlášení). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const info = token ? await inviteInfo(await getDb(), token) : null;
  return Response.json(info ?? { valid: false, coach_name: '' });
}
