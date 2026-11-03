import type { Db } from '@/server/db/types';
import { env } from '@/server/env';
import { loadToken, storeToken } from '@/server/tokens';
import { googleSheetsApi } from './api';
import { csvExportSource } from './csv-export';
import { mockSheets, mockWriter } from './mock';
import { googleSheetsWriter } from './write';
import { SheetsError, type SheetsSource, type SheetsWriter } from './types';

export * from './types';
export { parseSheetUrl } from './url';

interface GoogleToken { refresh_token?: string; access_token?: string; expires_at?: number }

/** Platný Google access token: uložený, obnovený přes refresh token, nebo ten, co poslal klient po přihlášení. */
export async function googleAccessToken(db: Db, uid: string, fromClient?: string | null): Promise<string | null> {
  const tok = await loadToken<GoogleToken>(db, uid, 'google');
  if (tok?.access_token && tok.expires_at && tok.expires_at > Date.now() + 60_000) return tok.access_token;
  if (tok?.refresh_token && env.googleClientId && env.googleClientSecret) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.googleClientId, client_secret: env.googleClientSecret,
        refresh_token: tok.refresh_token, grant_type: 'refresh_token',
      }),
    });
    if (res.ok) {
      const j = await res.json();
      await storeToken(db, uid, 'google', { ...tok, access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 });
      return j.access_token;
    }
  }
  return fromClient ?? null;
}

/** Zdroj sheetu: mock (vývoj), API pod účtem uživatele, nebo záloha přes CSV export. */
export async function sheetsSource(db: Db, uid: string, opts: { clientToken?: string | null; gid?: number | null }): Promise<SheetsSource> {
  if (env.mockIntegrations) return mockSheets();
  const token = await googleAccessToken(db, uid, opts.clientToken);
  return token ? googleSheetsApi(token) : csvExportSource(fetch, opts.gid ?? null);
}

/** Zápis potřebuje token s právem úprav; bez tokenu nejde (CSV export je jen pro čtení). */
export async function sheetsWriter(db: Db, uid: string, opts: { clientToken?: string | null }): Promise<SheetsWriter> {
  if (env.mockIntegrations) return mockWriter();
  const token = await googleAccessToken(db, uid, opts.clientToken);
  if (!token) throw new SheetsError('google_login');
  return googleSheetsWriter(token);
}
