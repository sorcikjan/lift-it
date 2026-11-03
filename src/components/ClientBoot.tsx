'use client';
import { useEffect } from 'react';
import { ensureLibrary } from '@/client/library';
import { startSync } from '@/client/sync';
import { refreshMe } from '@/client/me';

/** Spustí se jednou v prohlížeči: knihovna do IndexedDB, synchronizace, přihlášený uživatel. */
export function ClientBoot() {
  useEffect(() => {
    void ensureLibrary().catch(() => {});
    startSync();
    void refreshMe();
  }, []);
  return null;
}
