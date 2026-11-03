'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;

export const supabaseEnabled = !!(url && key);

/** Supabase jen pro přihlášení (Google). Data jdou přes /api/sync pod RLS. */
export function supabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  client ??= createClient(url!, key!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } });
  return client;
}

export async function authHeader(): Promise<Record<string, string>> {
  const s = supabase();
  if (!s) return {};
  const { data } = await s.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
/** A9: zápis do trenérova sheetu potřebuje širší scope; žádá se až při prvním zápisu. */
export const SHEETS_WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export async function signInWithGoogle(next = '/', opts: { write?: boolean } = {}) {
  const s = supabase();
  if (!s) return;
  await s.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: opts.write ? SHEETS_WRITE_SCOPE : SHEETS_SCOPE,
      redirectTo: `${location.origin}/ucet?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
}
