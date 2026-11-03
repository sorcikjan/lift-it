import { PGlite } from '@electric-sql/pglite';
import { authStubSql, migrationSql } from './migrations';
import { claims, type Db, type Tx } from './types';

/** Lokální Postgres ve WASM se stejnými migracemi a RLS jako Supabase. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  await pg.exec(await authStubSql());
  for (const sql of await migrationSql()) await pg.exec(sql);

  const wrap = (q: { query: PGlite['query'] }): Tx => ({
    async query(sql, params = []) {
      const res = await q.query(sql, params as never[]);
      return res.rows as never[];
    },
  });

  return {
    ...wrap(pg),
    async asUser(userId, fn) {
      return pg.transaction(async (t) => {
        await t.query(`select set_config('request.jwt.claims', $1, true)`, [claims(userId)]);
        await t.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
        return fn(wrap(t));
      });
    },
    close: () => pg.close(),
  };
}
