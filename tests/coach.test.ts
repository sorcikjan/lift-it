import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.INTEGRATIONS_MOCK = '1'; });
import { randomUUID } from 'node:crypto';
import { createPgliteDb } from '@/server/db/pglite';
import { applyChanges, pullAll } from '@/server/sync';
import {
  acceptInvite, addComment, becomeCoach, clientData, coachWrite, createInvite, endCoaching, inviteInfo, listClients, listComments,
  publishWeek, saveSubscription,
} from '@/server/coach';
import { sentPushes } from '@/integrations/push/mock';
import { copyWeek, weekTree, bumpWeights, type PlanRows } from '@/domain/coach/plan-ops';
import type { Db } from '@/server/db/types';
import type { Change } from '@/shared/sync-tables';

let db: Db;
const athlete = randomUUID(), coach = randomUUID(), stranger = randomUUID();
const ids = { program: randomUUID(), week: randomUUID(), workout: randomUUID(), pe: randomUUID(), ps: randomUUID(), session: randomUUID(), set: randomUUID() };

beforeAll(async () => {
  db = await createPgliteDb();
  await db.query(`insert into exercises (id, name_cs) values ('Leg_Press', 'Leg press')`);
  for (const [id, name] of [[athlete, 'Jan'], [coach, 'Trenér Petr'], [stranger, 'Cizí']]) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${name.replace(' ', '')}@test.cz`]);
    await db.query(`update profiles set name = $2 where id = $1`, [id, name]);
  }
  const changes: Change[] = [
    { table: 'programs', row: { id: ids.program, name: 'Do Vánoc 2026' } },
    { table: 'plan_weeks', row: { id: ids.week, program_id: ids.program, week_start: '2026-11-02', source: 'sheet', published: true } },
    { table: 'workouts', row: { id: ids.workout, week_id: ids.week, label: 'A', position: 0 } },
    { table: 'planned_exercises', row: { id: ids.pe, workout_id: ids.workout, exercise_id: 'Leg_Press', position: 0, blok: 'hlavni', source_name: 'Leg press' } },
    { table: 'planned_sets', row: { id: ids.ps, planned_exercise_id: ids.pe, number: 1, reps_max: 10, weight_kg: 40 } },
    { table: 'sessions', row: { id: ids.session, workout_id: ids.workout, started_at: '2026-11-03T17:00:00Z', ended_at: '2026-11-03T18:00:00Z', status: 'done' } },
    { table: 'logged_sets', row: { id: ids.set, session_id: ids.session, exercise_id: 'Leg_Press', planned_set_id: ids.ps, planned_exercise_id: ids.pe, number: 1, reps: 10, weight_kg: 45, logged_at: '2026-11-03T17:10:00Z' } },
  ];
  const r = await applyChanges(db, athlete, changes);
  expect(r.rejected).toEqual([]);
});
afterAll(() => db.close());

describe('E2: trenér a pozvánka', () => {
  it('stát se trenérem, pozvat, klient přijme', async () => {
    await becomeCoach(db, coach);
    const [p] = await db.query<{ roles: string[] }>(`select roles from profiles where id = $1`, [coach]);
    expect(p.roles).toContain('coach');
    const token = await createInvite(db, coach);
    expect(await inviteInfo(db, token)).toEqual({ coach_name: 'Trenér Petr', valid: true });
    await expect(acceptInvite(db, coach, token)).rejects.toMatchObject({ code: 'invite_self' });
    expect(await acceptInvite(db, athlete, token)).toBe(coach);
    expect((await inviteInfo(db, token))?.valid).toBe(false);
    await expect(acceptInvite(db, stranger, token)).rejects.toMatchObject({ code: 'invite_invalid' });
    expect(await inviteInfo(db, 'neexistuje')).toBeNull();
  });

  it('trenér vidí klienta v seznamu s posledním tréninkem', async () => {
    const list = await listClients(db, coach);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: athlete, name: 'Jan' });
    expect(list[0].lastSession).not.toBeNull();
    expect(await listClients(db, stranger)).toEqual([]);
  });
});

describe('E3: plán od trenéra', () => {
  let newWeek: string;
  it('kopie týdne jako koncept: trenér ji vidí, klient ne', async () => {
    const data = await clientData(db, coach, athlete) as unknown as PlanRows;
    const copy = copyWeek(weekTree(ids.week, data)!, randomUUID, new Date().toISOString());
    newWeek = copy.week.id;
    const bumped = bumpWeights(copy);
    const changes: Change[] = [
      { table: 'plan_weeks', row: copy.week as unknown as Record<string, unknown> },
      ...copy.workouts.map((row) => ({ table: 'workouts' as const, row: row as unknown as Record<string, unknown> })),
      ...copy.exercises.map((row) => ({ table: 'planned_exercises' as const, row: row as unknown as Record<string, unknown> })),
      ...copy.sets.map((s) => ({ table: 'planned_sets' as const, row: (bumped.find((b) => b.id === s.id) ?? s) as unknown as Record<string, unknown> })),
    ];
    const r = await coachWrite(db, coach, athlete, changes);
    expect(r.rejected).toEqual([]);
    const coachView = await clientData(db, coach, athlete);
    expect((coachView.plan_weeks as { id: string }[]).map((w) => w.id)).toContain(newWeek);
    expect((coachView.planned_sets as { weight_kg: number }[]).map((s) => s.weight_kg).sort()).toEqual([40, 42.5]);
    const athleteView = await pullAll(db, athlete);
    expect((athleteView.plan_weeks as { id: string }[]).map((w) => w.id)).not.toContain(newWeek);
    expect(athleteView.workouts).toHaveLength(1);
  });

  it('publikace: klient týden uvidí a dostane upozornění', async () => {
    await saveSubscription(db, athlete, { endpoint: 'https://push.example/jan', keys: { p256dh: 'k', auth: 'a' } });
    sentPushes.length = 0;
    expect(await publishWeek(db, coach, athlete, newWeek)).toBe(true);
    const athleteView = await pullAll(db, athlete);
    expect((athleteView.plan_weeks as { id: string }[]).map((w) => w.id)).toContain(newWeek);
    expect(athleteView.workouts).toHaveLength(2);
    expect(sentPushes).toEqual([{ endpoint: 'https://push.example/jan', payload: { title: 'Nový plán od trenéra', body: 'Týden od 9. 11. 2026 je připravený.', url: '/' } }]);
  });

  it('cizí trenér nic nezapíše ani nepřečte', async () => {
    await becomeCoach(db, stranger);
    await expect(clientData(db, stranger, athlete)).rejects.toMatchObject({ code: 'not_client' });
    await expect(coachWrite(db, stranger, athlete, [])).rejects.toMatchObject({ code: 'not_client' });
    await expect(publishWeek(db, stranger, athlete, newWeek)).rejects.toMatchObject({ code: 'not_client' });
  });

  it('trenér nemůže přes zápis plánu podstrčit sérii ani trénink', async () => {
    const r = await coachWrite(db, coach, athlete, [
      { table: 'sessions', row: { id: randomUUID(), started_at: new Date().toISOString() } },
      { table: 'logged_sets', row: { id: randomUUID(), session_id: ids.session, exercise_id: 'Leg_Press', number: 9, logged_at: new Date().toISOString() } },
    ]);
    expect(r.applied).toEqual([]);
    expect((await pullAll(db, athlete)).logged_sets).toHaveLength(1);
  });
});

describe('E5: komentáře obousměrně + E6 upozornění', () => {
  it('trenér okomentuje sérii, klient to vidí a dostane upozornění s odkazem na shrnutí', async () => {
    sentPushes.length = 0;
    await addComment(db, coach, { clientId: athlete, targetType: 'logged_set', targetId: ids.set, text: 'Super, příště 47,5' });
    const list = await listComments(db, athlete, athlete);
    expect(list.map((c) => [c.author_name, c.text])).toEqual([['Trenér Petr', 'Super, příště 47,5']]);
    expect(sentPushes[0].payload.url).toBe(`/shrnuti?id=${ids.session}`);
  });

  it('klient odpoví, trenér dostane upozornění', async () => {
    await saveSubscription(db, coach, { endpoint: 'https://push.example/petr', keys: { p256dh: 'k', auth: 'a' } });
    sentPushes.length = 0;
    await addComment(db, athlete, { clientId: athlete, targetType: 'session', targetId: ids.session, text: 'Díky!' });
    expect(sentPushes.map((p) => [p.endpoint, p.payload.url])).toEqual([['https://push.example/petr', `/trener/klient?id=${athlete}`]]);
    expect((await listComments(db, coach, athlete)).map((c) => c.text)).toEqual(['Super, příště 47,5', 'Díky!']);
  });

  it('cizí komentáře nečte a nepíše', async () => {
    expect(await listComments(db, stranger, athlete)).toEqual([]);
    await expect(addComment(db, stranger, { clientId: athlete, targetType: 'session', targetId: ids.session, text: 'x' })).rejects.toThrow(/row-level security/);
  });

  it('ukončená spolupráce zavře přístup', async () => {
    await endCoaching(db, athlete, coach);
    expect(await listClients(db, coach)).toEqual([]);
    await expect(clientData(db, coach, athlete)).rejects.toMatchObject({ code: 'not_client' });
  });
});
