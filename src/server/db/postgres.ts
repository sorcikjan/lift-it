import postgres from 'postgres';
import { claims, type Db, type Tx } from './types';

/** Produkce: přímé spojení na Supabase Postgres (pooler v transakčním režimu). */
export function createPostgresDb(url: string): Db {
  const sql = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  const wrap = (s: postgres.Sql | postgres.TransactionSql): Tx => ({
    async query(text, params = []) {
      return (await s.unsafe(text, params as never[])) as never[];
    },
  });
  return {
    ...wrap(sql),
    async asUser(userId, fn) {
      return (await sql.begin(async (t) => {
        await t.unsafe(`select set_config('request.jwt.claims', $1, true)`, [claims(userId)]);
        await t.unsafe(`set local role ${userId ? 'authenticated' : 'anon'}`);
        return fn(wrap(t));
      })) as never;
    },
    close: () => sql.end(),
  };
}
