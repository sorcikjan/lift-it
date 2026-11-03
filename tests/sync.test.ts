import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createPgliteDb } from '@/server/db/pglite';
import { applyChanges, pullAll } from '@/server/sync';
import type { Db } from '@/server/db/types';
import type { Change } from '@/shared/sync-tables';

let db: Db;
const me = randomUUID();
const other = randomUUID();
beforeAll(async () => {
  db = await createPgliteDb();
  await db.query(`insert into exercises (id, name_cs) values ('Leg_Press', 'Leg press')`);
  for (const id of [me, other]) await db.query(`insert into auth.users (id) values ($1)`, [id]);
});
afterAll(() => db.close());

const ids = { program: randomUUID(), week: randomUUID(), workout: randomUUID(), pe: randomUUID(), ps: randomUUID(), session: randomUUID() };
const plan = (): Change[] => [
  { table: 'logged_sets', row: { id: 'x', session_id: ids.session } }, // špatné id i pořadí: nesmí shodit dávku
  { table: 'planned_sets', row: { id: ids.ps, planned_exercise_id: ids.pe, number: 1, reps_max: 10, weight_kg: 37.5 } },
  { table: 'programs', row: { id: ids.program, client_id: 'podvrh', name: 'Do Vánoc' } },
  { table: 'plan_weeks', row: { id: ids.week, program_id: ids.program, week_start: '2026-11-09', source: 'paste', raw_snapshot: [['Leg press', '4', '10']] } },
  { table: 'workouts', row: { id: ids.workout, week_id: ids.week, label: 'A', position: 0 } },
  { table: 'planned_exercises', row: { id: ids.pe, workout_id: ids.workout, exercise_id: 'Leg_Press', position: 0, blok: 'hlavni' } },
  { table: 'sessions', row: { id: ids.session, user_id: other, workout_id: ids.workout, started_at: new Date().toISOString(), actual_order: [ids.pe] } },
];

describe('sync: idempotentní upsert', () => {
  it('uloží plán v pořadí rodič → dítě a vlastníka přepíše na přihlášeného', async () => {
    const r = await applyChanges(db, me, plan());
    expect(r.rejected.map((x) => x.id)).toEqual(['x']);
    const [p] = await db.query<{ client_id: string }>(`select client_id from programs`);
    expect(p.client_id).toBe(me); // podvržené client_id se přepíše
  });

  it('stejná série odeslaná 3× je v DB právě jednou', async () => {
    const set = { id: randomUUID(), session_id: ids.session, exercise_id: 'Leg_Press', planned_set_id: ids.ps, number: 1, reps: 10, weight_kg: 37.5, logged_at: new Date().toISOString() };
    for (let i = 0; i < 3; i++) await applyChanges(db, me, [{ table: 'logged_sets', row: set }]);
    const rows = await db.query<{ n: number }>(`select count(*)::int n from logged_sets where id = $1`, [set.id]);
    expect(rows[0].n).toBe(1);
  });

  it('pozdější oprava série (shrnutí) přepíše hodnotu', async () => {
    const id = randomUUID();
    const base = { id, session_id: ids.session, exercise_id: 'Leg_Press', number: 2, reps: 10, weight_kg: 40, logged_at: new Date().toISOString() };
    await applyChanges(db, me, [{ table: 'logged_sets', row: base }]);
    await applyChanges(db, me, [{ table: 'logged_sets', row: { ...base, reps: 8 } }]);
    const [r] = await db.query<{ reps: number }>(`select reps from logged_sets where id = $1`, [id]);
    expect(r.reps).toBe(8);
  });

  it('cizí uživatel nezapíše do mého tréninku', async () => {
    const r = await applyChanges(db, other, [{ table: 'logged_sets', row: { id: randomUUID(), session_id: ids.session, exercise_id: 'Leg_Press', number: 9, reps: 1, logged_at: new Date().toISOString() } }]);
    expect(r.applied).toEqual([]);
    expect(r.rejected[0].error).toMatch(/row-level security/);
  });

  it('globální cvik z knihovny klient nepřepíše', async () => {
    const r = await applyChanges(db, me, [{ table: 'exercises', row: { id: 'Leg_Press', name_cs: 'hack' } }]);
    expect(r.rejected[0].error).toBe('global_exercise');
  });

  it('pull vrátí můj plán a série s čísly jako čísly', async () => {
    const data = await pullAll(db, me);
    expect((data.planned_sets as { weight_kg: number }[])[0].weight_kg).toBe(37.5);
    expect(data.sessions).toHaveLength(1);
    expect((data.logged_sets as unknown[]).length).toBe(2);
    const otherData = await pullAll(db, other);
    expect(otherData.sessions).toHaveLength(0);
  });
});
