'use client';
import { useEffect } from 'react';
import { ensureLibrary } from '@/client/library';
import { startSync } from '@/client/sync';
import { refreshMe } from '@/client/me';
import { pairPending } from '@/client/strava';

/** Spustí se jednou v prohlížeči: knihovna do IndexedDB, synchronizace, přihlášený uživatel. */
export function ClientBoot() {
  useEffect(() => {
    void ensureLibrary().catch(() => {});
    startSync();
    void refreshMe();
    // G2: po tréninku se tep a kalorie dopárují samy, jakmile je signál
    const pair = () => void pairPending().catch(() => {});
    const first = setTimeout(pair, 3000);
    window.addEventListener('online', pair);
    return () => { clearTimeout(first); window.removeEventListener('online', pair); };
  }, []);
  return null;
}
