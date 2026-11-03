import type { Db } from './db/types';
import { decrypt, encrypt } from './crypto';

export type Provider = 'google' | 'strava' | 'garmin';

/** Tokeny integrací šifrovaně v integration_tokens. Tabulka nemá RLS politiky: čte jen server. */
export async function loadToken<T>(db: Db, uid: string, provider: Provider): Promise<T | null> {
  const [row] = await db.query<{ data_enc: string }>(`select data_enc from integration_tokens where user_id = $1 and provider = $2`, [uid, provider]);
  if (!row) return null;
  try { return decrypt<T>(row.data_enc); } catch { return null; }
}

export async function storeToken(db: Db, uid: string, provider: Provider, data: unknown) {
  await db.query(
    `insert into integration_tokens (user_id, provider, data_enc) values ($1, $2, $3)
     on conflict (user_id, provider) do update set data_enc = excluded.data_enc`,
    [uid, provider, encrypt(data)],
  );
}

export async function deleteToken(db: Db, uid: string, provider: Provider) {
  await db.query(`delete from integration_tokens where user_id = $1 and provider = $2`, [uid, provider]);
}
