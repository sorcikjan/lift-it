import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { devAuthAllowed, env, supabaseConfigured } from './env';
import { getDb } from './db';

export interface AuthUser { id: string; email: string; name: string; dev: boolean }

export const DEV_ATHLETE = '00000000-0000-4000-8000-000000000001';
export const DEV_COACH = '00000000-0000-4000-8000-000000000002';
const DEV_NAMES: Record<string, string> = { [DEV_ATHLETE]: 'Jan', [DEV_COACH]: 'Trenér' };

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function verifySupabase(token: string): Promise<JWTPayload | null> {
  try {
    if (env.supabaseJwtSecret) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(env.supabaseJwtSecret));
      return payload;
    }
    jwks ??= createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks);
    return payload;
  } catch {
    return null;
  }
}

/** Uživatel z požadavku: Supabase JWT (Authorization: Bearer), nebo vývojový uživatel. */
export async function getUser(req: Request): Promise<AuthUser | null> {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (supabaseConfigured()) {
    if (!bearer) return null;
    const p = await verifySupabase(bearer);
    if (!p?.sub || p.role !== 'authenticated') return null;
    const meta = (p.user_metadata ?? {}) as Record<string, string>;
    return { id: p.sub, email: String(p.email ?? ''), name: meta.full_name ?? meta.name ?? '', dev: false };
  }
  if (!devAuthAllowed()) return null;
  const cookie = req.headers.get('cookie') ?? '';
  const fromCookie = cookie.match(/(?:^|;\s*)liftit_dev_user=([0-9a-f-]{36})/)?.[1];
  const id = req.headers.get('x-dev-user') ?? fromCookie ?? DEV_ATHLETE;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  await ensureDevUser(id);
  return { id, email: `${id.slice(-4)}@dev.local`, name: DEV_NAMES[id] ?? 'Testovací uživatel', dev: true };
}

const known = new Set<string>();
async function ensureDevUser(id: string) {
  if (known.has(id)) return;
  const db = await getDb();
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb) on conflict (id) do nothing`,
    [id, `${id.slice(-4)}@dev.local`, JSON.stringify({ full_name: DEV_NAMES[id] ?? 'Testovací uživatel' })],
  );
  known.add(id);
}

export function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
