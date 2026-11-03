'use client';
import type { Exercise, ExerciseAlias } from '@/domain/types';
import { db, getMeta, setMeta } from './db';

interface LibraryFile { version: number; exercises: Exercise[]; aliases: ExerciseAlias[] }

let loading: Promise<void> | null = null;

/** Zabalenou knihovnu (C1, C2) nahraje jednou do IndexedDB; funguje pak offline. */
export function ensureLibrary(): Promise<void> {
  loading ??= (async () => {
    const res = await fetch('/library/exercises.json');
    if (!res.ok) throw new Error('library');
    const text = await res.text();
    const sig = `${text.length}:${text.slice(-64)}`;
    if ((await getMeta<string>('librarySig')) === sig) return;
    const lib = JSON.parse(text) as LibraryFile;
    await db().transaction('rw', db().exercises, db().exercise_aliases, db().meta, async () => {
      await db().exercises.bulkPut(lib.exercises.map((e) => ({ ...e, owner_id: null })));
      await db().exercise_aliases.bulkPut(lib.aliases.map((a) => ({ ...a, id: `g:${a.text}`, owner_id: null })));
      await setMeta('librarySig', sig);
    });
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

export const exerciseName = (e: Pick<Exercise, 'name_cs' | 'name_en'> | undefined) => (e ? e.name_cs || e.name_en : '');
