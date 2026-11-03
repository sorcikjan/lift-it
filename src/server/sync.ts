import { SYNC_ORDER, SYNC_TABLES, type Change, type SyncResult, type SyncTable } from '@/shared/sync-tables';
import type { Db } from './db/types';

const MAX_BATCH = 500;

/**
 * Idempotentní upsert dávky změn z offline fronty. ID generuje klient, takže opakované
 * odeslání stejné dávky nic nezdvojí. Konflikt = poslední zápis vyhrává (na úrovni řádku/série).
 * Každý řádek ve vlastním savepointu: jedna odmítnutá změna nezablokuje zbytek.
 */
export async function applyChanges(db: Db, uid: string, changes: Change[]): Promise<SyncResult> {
  if (!Array.isArray(changes) || changes.length > MAX_BATCH) throw new Error('bad_batch');
  const sorted = changes
    .filter((c) => c && c.table in SYNC_TABLES && c.row && typeof c.row.id === 'string')
    .sort((a, b) => SYNC_ORDER.indexOf(a.table) - SYNC_ORDER.indexOf(b.table));
  const result: SyncResult = { applied: [], rejected: [] };

  await db.asUser(uid, async (tx) => {
    for (const c of sorted) {
      const def = SYNC_TABLES[c.table];
      const row: Record<string, unknown> = {};
      for (const col of def.cols) if (col in c.row) row[col] = c.row[col];
      if (def.owner) row[def.owner] = uid;
      if (c.table === 'exercises' && !String(row.id).startsWith('u-')) {
        result.rejected.push({ table: c.table, id: String(row.id), error: 'global_exercise' });
        continue;
      }
      const cols = Object.keys(row);
      const updates = cols.filter((k) => k !== 'id' && k !== def.owner).map((k) => `${k} = excluded.${k}`);
      const sql = `insert into ${c.table} (${cols.join(', ')})
        select ${cols.join(', ')} from jsonb_populate_record(null::${c.table}, $1::jsonb)
        on conflict (id) do ${updates.length ? `update set ${updates.join(', ')}` : 'nothing'}`;
      try {
        await tx.query('savepoint s');
        await tx.query(sql, [JSON.stringify(row)]);
        await tx.query('release savepoint s');
        result.applied.push(String(row.id));
      } catch (e) {
        await tx.query('rollback to savepoint s');
        result.rejected.push({ table: c.table, id: String(row.id), error: (e as Error).message.slice(0, 200) });
      }
    }
  });
  return result;
}

const agg = (from: string) => `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) r from ${from}`;

/** Všechno, co patří cvičenci (pro další zařízení a plány od trenéra). Jen vlastní data, ne data klientů. */
export async function pullAll(db: Db, uid: string): Promise<Record<SyncTable | 'profile', unknown>> {
  return db.asUser(uid, async (tx) => {
    const q = async (from: string, params: unknown[] = [uid]) =>
      (await tx.query<{ r: unknown[] }>(agg(from), params))[0].r;
    const progs = `(select id from programs where client_id = $1)`;
    const weeks = `(select id from plan_weeks where program_id in ${progs})`;
    const wos = `(select id from workouts where week_id in ${weeks})`;
    const pes = `(select id from planned_exercises where workout_id in ${wos})`;
    const sess = `(select id from sessions where user_id = $1)`;
    const [profile] = await tx.query(`select to_jsonb(p) r from profiles p where id = $1`, [uid]);
    return {
      profile: (profile as { r: unknown } | undefined)?.r ?? null,
      exercises: await q(`exercises t where owner_id is not null`, []),
      exercise_aliases: await q(`exercise_aliases t where owner_id = $1`),
      programs: await q(`programs t where client_id = $1`),
      plan_weeks: await q(`plan_weeks t where program_id in ${progs}`),
      workouts: await q(`workouts t where week_id in ${weeks}`),
      planned_exercises: await q(`planned_exercises t where workout_id in ${wos}`),
      planned_sets: await q(`planned_sets t where planned_exercise_id in ${pes}`),
      sessions: await q(`sessions t where user_id = $1`),
      logged_sets: await q(`logged_sets t where session_id in ${sess}`),
      session_notes: await q(`session_notes t where session_id in ${sess}`),
      measurements: await q(`measurements t where user_id = $1`),
      share_links: await q(`share_links t where owner_id = $1`),
      import_mappings: await q(`import_mappings t where owner_id = $1`),
      comments: await q(`comments t where client_id = $1`),
    };
  });
}
