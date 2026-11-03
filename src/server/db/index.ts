import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env';
import type { Db } from './types';

const g = globalThis as unknown as { __liftitDb?: Promise<Db> };

/** Jedna instance databáze na proces: Supabase Postgres, nebo lokální PGlite se seedem knihovny. */
export function getDb(): Promise<Db> {
  if (!g.__liftitDb) g.__liftitDb = open().catch((e) => { g.__liftitDb = undefined; throw e; });
  return g.__liftitDb;
}

async function open(): Promise<Db> {
  if (env.databaseUrl) {
    const { createPostgresDb } = await import('./postgres');
    return createPostgresDb(env.databaseUrl);
  }
  const { createPgliteDb } = await import('./pglite');
  const db = await createPgliteDb(env.dbMode === 'memory' ? undefined : path.join(process.cwd(), env.dbMode));
  await seedLibrary(db);
  return db;
}

/** Lokálně naplní globální knihovnu z public/library/exercises.json (stejná data jako appka). */
export async function seedLibrary(db: Db): Promise<void> {
  const [{ n }] = await db.query<{ n: number }>(`select count(*)::int n from exercises where owner_id is null`);
  const lib = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'library', 'exercises.json'), 'utf8'));
  if (n >= lib.exercises.length) return;
  await db.query(
    `insert into exercises (id, name_cs, name_en, type, equipment, muscles, images, steps_cs, steps_en, source, license, author)
     select id, name_cs, name_en, type, equipment, muscles, images, steps_cs, steps_en, source, license, author
     from jsonb_populate_recordset(null::exercises, $1::jsonb)
     on conflict (id) do nothing`,
    [JSON.stringify(lib.exercises)],
  );
  await db.query(
    `insert into exercise_aliases (id, text, exercise_id, owner_id)
     select gen_random_uuid(), a.text, a.exercise_id, null
     from jsonb_to_recordset($1::jsonb) as a(text text, exercise_id text)
     on conflict do nothing`,
    [JSON.stringify(lib.aliases)],
  );
}
