'use client';
import { authHeader, supabase } from './supabase';
import { getMeta, setMeta } from './db';

export interface Me { id: string; name: string; email: string; roles?: string[]; dev: boolean }
export type AuthMode = 'supabase' | 'dev' | 'none';

const listeners = new Set<(m: Me | null, mode: AuthMode) => void>();
let me: Me | null = null;
let mode: AuthMode = 'none';

export const onMe = (fn: (m: Me | null, mode: AuthMode) => void) => { listeners.add(fn); fn(me, mode); return () => listeners.delete(fn); };

/** Kdo je přihlášený (server ověří token). Offline se použije poslední známý stav. */
export async function refreshMe(): Promise<Me | null> {
  me = (await getMeta<Me>('me')) ?? null;
  listeners.forEach((fn) => fn(me, mode));
  try {
    const res = await fetch('/api/me', { headers: await authHeader() });
    const data = await res.json();
    me = data.user;
    mode = data.auth;
    await setMeta('me', me);
    if (me) await setMeta('userId', me.id);
  } catch { /* offline */ }
  listeners.forEach((fn) => fn(me, mode));
  return me;
}

if (typeof window !== 'undefined') {
  supabase()?.auth.onAuthStateChange((event, session) => {
    // Obnovovací token Googlu přijde jen hned po přihlášení: uložit ho šifrovaně na server (import sheetu).
    if (event === 'SIGNED_IN' && (session?.provider_refresh_token || session?.provider_token)) {
      void fetch('/api/google/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ refresh_token: session.provider_refresh_token, access_token: session.provider_token }),
      }).catch(() => {});
    }
    void refreshMe();
  });
}
