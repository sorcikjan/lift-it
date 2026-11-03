'use client';
import { useEffect, useState } from 'react';
import { ensureLibrary } from './library';

/** Počká, než je knihovna v IndexedDB (první spuštění). */
export function useLibraryReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => { void ensureLibrary().then(() => setReady(true), () => setReady(true)); }, []);
  return ready;
}
