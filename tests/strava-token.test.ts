import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createPgliteDb } from '@/server/db/pglite';
import { loadToken, storeToken } from '@/server/tokens';
import { stravaToken, type StravaToken } from '@/integrations/strava';
import type { Db } from '@/server/db/types';

let db: Db;
const me = randomUUID();
beforeAll(async () => {
  db = await createPgliteDb();
  await db.query(`insert into auth.users (id) values ($1)`, [me]);
});
afterAll(() => db.close());

describe('G1: tokeny Stravy šifrovaně na serveru, automatická obnova', () => {
  it('v DB je jen šifrovaný text', async () => {
    await storeToken(db, me, 'strava', { access_token: 'tajny-access', refresh_token: 'tajny-refresh', expires_at: 1, write_description: false });
    const [row] = await db.query<{ data_enc: string }>(`select data_enc from integration_tokens where user_id = $1`, [me]);
    expect(row.data_enc).not.toContain('tajny');
  });

  it('vypršený token obnoví, uloží a nastavení zachová', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ access_token: 'novy', refresh_token: 'novy-r', expires_at: Math.floor(Date.now() / 1000) + 21600 })));
    const tok = await stravaToken(db, me, f as unknown as typeof fetch);
    expect(tok.access_token).toBe('novy');
    expect(tok.write_description).toBe(false);
    expect((await loadToken<StravaToken>(db, me, 'strava'))?.refresh_token).toBe('novy-r');
    // platný token už znovu neobnovuje
    await stravaToken(db, me, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('odvolaný přístup = odpojeno a token smazaný', async () => {
    await storeToken(db, me, 'strava', { access_token: 'a', refresh_token: 'r', expires_at: 1 });
    const f = async () => new Response('', { status: 401 });
    await expect(stravaToken(db, me, f as unknown as typeof fetch)).rejects.toMatchObject({ code: 'not_connected' });
    expect(await loadToken(db, me, 'strava')).toBeNull();
  });

  it('bez propojení = not_connected', async () => {
    await expect(stravaToken(db, randomUUID())).rejects.toMatchObject({ code: 'not_connected' });
  });
});
