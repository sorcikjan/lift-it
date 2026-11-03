import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createPgliteDb } from '@/server/db/pglite';
import type { Db } from '@/server/db/types';

let db: Db;
const athlete = randomUUID();
const other = randomUUID();
const coach = randomUUID();
const otherCoach = randomUUID();
const program = randomUUID();
const week = randomUUID();
const workout = randomUUID();
const pe = randomUUID();
const ps = randomUUID();
const session = randomUUID();
const otherSession = randomUUID();

beforeAll(async () => {
  db = await createPgliteDb();
  for (const id of [athlete, other, coach, otherCoach]) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${id}@test.cz`]);
  }
  await db.query(`insert into exercises (id, name_cs) values ('Leg_Press', 'Leg press')`);
  await db.query(`insert into coach_clients (coach_id, client_id) values ($1, $2)`, [coach, athlete]);

  await db.asUser(athlete, async (tx) => {
    await tx.query(`insert into programs (id, client_id, name) values ($1, $2, 'Do Vánoc')`, [program, athlete]);
    await tx.query(`insert into plan_weeks (id, program_id, week_start) values ($1, $2, '2026-11-09')`, [week, program]);
    await tx.query(`insert into workouts (id, week_id, label) values ($1, $2, 'A')`, [workout, week]);
    await tx.query(`insert into planned_exercises (id, workout_id, exercise_id, position) values ($1, $2, 'Leg_Press', 1)`, [pe, workout]);
    await tx.query(`insert into planned_sets (id, planned_exercise_id, number, reps_max, weight_kg) values ($1, $2, 1, 10, 40)`, [ps, pe]);
    await tx.query(`insert into sessions (id, user_id, workout_id, started_at) values ($1, $2, $3, now())`, [session, athlete, workout]);
    await tx.query(
      `insert into logged_sets (id, session_id, exercise_id, planned_set_id, number, reps, weight_kg, logged_at)
       values ($1, $2, 'Leg_Press', $3, 1, 10, 40, now())`,
      [randomUUID(), session, ps],
    );
  });
  await db.asUser(other, (tx) =>
    tx.query(`insert into sessions (id, user_id, started_at) values ($1, $2, now())`, [otherSession, other]),
  );
});
afterAll(() => db.close());

const count = async (uid: string | null, table: string) =>
  (await db.asUser(uid, (tx) => tx.query<{ n: number }>(`select count(*)::int n from ${table}`)))[0].n;

describe('RLS: cvičenec vidí jen svoje', () => {
  it('vlastní trénink a série vidí', async () => {
    expect(await count(athlete, 'sessions')).toBe(1);
    expect(await count(athlete, 'logged_sets')).toBe(1);
    expect(await count(athlete, 'programs')).toBe(1);
  });
  it('cizí trénink nevidí', async () => {
    expect(await count(other, 'sessions')).toBe(1);
    expect(await count(other, 'logged_sets')).toBe(0);
    expect(await count(other, 'programs')).toBe(0);
    expect(await count(other, 'planned_sets')).toBe(0);
  });
  it('do cizího tréninku nezapíše sérii', async () => {
    await expect(
      db.asUser(other, (tx) =>
        tx.query(
          `insert into logged_sets (id, session_id, exercise_id, number, reps, logged_at) values ($1, $2, 'Leg_Press', 2, 10, now())`,
          [randomUUID(), session],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('trénink pod cizím jménem nezaloží', async () => {
    await expect(
      db.asUser(other, (tx) =>
        tx.query(`insert into sessions (id, user_id, started_at) values ($1, $2, now())`, [randomUUID(), athlete]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('roli trenéra si sám nezapne přímým zápisem', async () => {
    await expect(
      db.asUser(athlete, (tx) => tx.query(`update profiles set roles = '{athlete,admin}' where id = $1`, [athlete])),
    ).rejects.toThrow(/roles_readonly/);
  });
  it('anonym nevidí nic', async () => {
    expect(await count(null, 'sessions')).toBe(0);
    expect(await count(null, 'profiles')).toBe(0);
    expect(await count(null, 'share_links')).toBe(0);
  });
});

describe('RLS: trenér vidí jen svoje klienty', () => {
  it('trenér čte plán a série svého klienta', async () => {
    expect(await count(coach, 'sessions')).toBe(1);
    expect(await count(coach, 'logged_sets')).toBe(1);
    expect(await count(coach, 'planned_sets')).toBe(1);
  });
  it('trenér může plánovat svému klientovi', async () => {
    await db.asUser(coach, (tx) =>
      tx.query(`insert into plan_weeks (id, program_id, week_start, source, published) values ($1, $2, '2026-11-16', 'app', false)`, [randomUUID(), program]),
    );
    expect(await count(coach, 'plan_weeks')).toBe(2);
    expect(await count(athlete, 'plan_weeks')).toBe(1); // koncept klient nevidí
  });
  it('trenér nezapisuje série za klienta', async () => {
    await expect(
      db.asUser(coach, (tx) =>
        tx.query(
          `insert into logged_sets (id, session_id, exercise_id, number, reps, logged_at) values ($1, $2, 'Leg_Press', 3, 10, now())`,
          [randomUUID(), session],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('cizí trenér nevidí nic', async () => {
    expect(await count(otherCoach, 'sessions')).toBe(0);
    expect(await count(otherCoach, 'logged_sets')).toBe(0);
    expect(await count(otherCoach, 'programs')).toBe(0);
  });
  it('ukončená spolupráce zavře přístup', async () => {
    await db.query(`update coach_clients set status = 'ended' where coach_id = $1`, [coach]);
    expect(await count(coach, 'sessions')).toBe(0);
    await db.query(`update coach_clients set status = 'active' where coach_id = $1`, [coach]);
  });
});

describe('RLS: ShareLink jen čtení', () => {
  const token = 'tok-' + randomUUID();
  beforeAll(async () => {
    await db.asUser(athlete, (tx) =>
      tx.query(`insert into share_links (id, owner_id, session_id, token) values ($1, $2, $3, $4)`, [randomUUID(), athlete, session, token]),
    );
  });
  it('anonym přečte shrnutí přes token', async () => {
    const [row] = await db.asUser(null, (tx) => tx.query<{ r: { sets: unknown[] } }>(`select get_shared_session($1) r`, [token]));
    expect(row.r.sets).toHaveLength(1);
  });
  it('špatný token nic nevrátí', async () => {
    const [row] = await db.asUser(null, (tx) => tx.query<{ r: unknown }>(`select get_shared_session('x') r`));
    expect(row.r).toBeNull();
  });
  it('anonym nemůže nic zapsat', async () => {
    await expect(
      db.asUser(null, (tx) => tx.query(`update sessions set note = 'x'`)).then(() => count(athlete, 'sessions')),
    ).resolves.toBe(1);
    const [s] = await db.asUser(athlete, (tx) => tx.query<{ note: string | null }>(`select note from sessions`));
    expect(s.note).toBeNull();
  });
  it('sdílet cizí trénink nejde', async () => {
    await expect(
      db.asUser(other, (tx) =>
        tx.query(`insert into share_links (id, owner_id, session_id, token) values ($1, $2, $3, 'x2')`, [randomUUID(), other, session]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('Pozvánka trenéra', () => {
  it('klient přijme pozvánku a trenér ho vidí', async () => {
    const token = 'inv-' + randomUUID();
    await db.query(`insert into coach_invites (token, coach_id) values ($1, $2)`, [token, otherCoach]);
    await db.asUser(other, (tx) => tx.query(`select accept_invite($1)`, [token]));
    expect(await count(otherCoach, 'sessions')).toBe(1);
  });
});
