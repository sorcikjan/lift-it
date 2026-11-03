/**
 * Trenér v appce (E2–E5) na serveru. Vše běží pod RLS přihlášeného (db.asUser),
 * takže trenér vidí a plánuje jen svým aktivním klientům.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import type { Db } from './db/types';
import { applyChanges, pullFor } from './sync';
import type { Change, SyncResult } from '@/shared/sync-tables';
import { notifyUser } from '@/integrations/push';
import { fullDate } from '@/domain/dates';
import { t } from '@/i18n/t';

export class CoachError extends Error {
  constructor(public code: 'not_client' | 'invite_invalid' | 'invite_self' | 'bad_request') { super(code); }
}

export async function becomeCoach(db: Db, uid: string) {
  await db.asUser(uid, (tx) => tx.query(`select become_coach()`));
}

export async function createInvite(db: Db, uid: string): Promise<string> {
  const token = randomBytes(18).toString('base64url');
  await db.asUser(uid, (tx) => tx.query(`insert into coach_invites (token, coach_id) values ($1, $2)`, [token, uid]));
  return token;
}

export async function inviteInfo(db: Db, token: string): Promise<{ coach_name: string; valid: boolean } | null> {
  const [r] = await db.asUser(null, (tx) => tx.query<{ r: { coach_name: string; valid: boolean } | null }>(`select invite_info($1) r`, [token]));
  return r?.r ?? null;
}

export async function acceptInvite(db: Db, uid: string, token: string): Promise<string> {
  try {
    const [r] = await db.asUser(uid, (tx) => tx.query<{ coach: string }>(`select accept_invite($1) coach`, [token]));
    return r.coach;
  } catch (e) {
    throw new CoachError(String((e as Error).message).includes('invite_self') ? 'invite_self' : 'invite_invalid');
  }
}

export interface ClientSummary { id: string; name: string; email: string; lastSession: string | null; sessions7d: number }

export async function listClients(db: Db, coachId: string): Promise<ClientSummary[]> {
  return db.asUser(coachId, (tx) => tx.query<ClientSummary>(`
    select p.id, p.name, p.email,
      (select max(s.started_at) from sessions s where s.user_id = p.id and s.status = 'done' and not s.archived) as "lastSession",
      (select count(*)::int from sessions s where s.user_id = p.id and s.status = 'done' and not s.archived and s.started_at > now() - interval '7 days') as "sessions7d"
    from coach_clients cc join profiles p on p.id = cc.client_id
    where cc.coach_id = $1 and cc.status = 'active'
    order by p.name, p.email`, [coachId]));
}

/** Klienti i trenéři přihlášeného (pro Účet: s kým spolupracuji). */
export async function myCoaches(db: Db, uid: string) {
  return db.asUser(uid, (tx) => tx.query<{ id: string; name: string; email: string }>(`
    select p.id, p.name, p.email from coach_clients cc join profiles p on p.id = cc.coach_id
    where cc.client_id = $1 and cc.status = 'active'`, [uid]));
}

export async function endCoaching(db: Db, uid: string, otherId: string) {
  await db.asUser(uid, (tx) => tx.query(
    `update coach_clients set status = 'ended' where (coach_id = $1 and client_id = $2) or (client_id = $1 and coach_id = $2)`, [uid, otherId]));
}

async function assertClient(db: Db, coachId: string, clientId: string) {
  const [r] = await db.asUser(coachId, (tx) => tx.query<{ ok: boolean }>(`select is_coach_of($1) ok`, [clientId]));
  if (!r?.ok) throw new CoachError('not_client');
}

/** E4: všechna data klienta (i koncepty týdnů) očima trenéra. */
export async function clientData(db: Db, coachId: string, clientId: string) {
  await assertClient(db, coachId, clientId);
  return pullFor(db, coachId, clientId);
}

const PLAN_TABLES = ['programs', 'plan_weeks', 'workouts', 'planned_exercises', 'planned_sets'] as const;

/** E3: zápis plánu klientovi. Program vždy patří klientovi; RLS ověří, že je to můj klient. */
export async function coachWrite(db: Db, coachId: string, clientId: string, changes: Change[]): Promise<SyncResult> {
  await assertClient(db, coachId, clientId);
  return applyChanges(db, coachId, changes, { tables: PLAN_TABLES, force: { programs: { client_id: clientId } } });
}

/** E3 + E6: publikovat týden; klient ho uvidí a dostane upozornění. */
export async function publishWeek(db: Db, coachId: string, clientId: string, weekId: string): Promise<boolean> {
  await assertClient(db, coachId, clientId);
  const rows = await db.asUser(coachId, (tx) => tx.query<{ week_start: string }>(
    `update plan_weeks set published = true where id = $1 and program_id in (select id from programs where client_id = $2)
     returning to_char(week_start, 'YYYY-MM-DD') as week_start`, [weekId, clientId]));
  if (!rows.length) return false;
  await notifyUser(db, clientId, { title: t('coach.notifikaceNovyPlan'), body: t('coach.notifikaceNovyPlanText', { date: fullDate(rows[0].week_start) }), url: '/' });
  return true;
}

// --- Komentáře (E5) -------------------------------------------------------------------------

export interface CommentView { id: string; client_id: string; author_id: string; author_name: string; target_type: string; target_id: string; text: string; created_at: string }

export async function listComments(db: Db, uid: string, clientId: string): Promise<CommentView[]> {
  return db.asUser(uid, (tx) => tx.query<CommentView>(`
    select c.id, c.client_id, c.author_id, coalesce(nullif(p.name, ''), split_part(p.email, '@', 1), '') as author_name,
      c.target_type, c.target_id, c.text, c.created_at
    from comments c left join profiles p on p.id = c.author_id
    where c.client_id = $1 and not c.archived order by c.created_at`, [clientId]));
}

export async function addComment(db: Db, uid: string, input: { id?: string; clientId: string; targetType: string; targetId: string; text: string }) {
  const text = input.text.trim().slice(0, 2000);
  if (!text || !['session', 'logged_set', 'workout'].includes(input.targetType)) throw new CoachError('bad_request');
  const id = input.id ?? randomUUID();
  await db.asUser(uid, (tx) => tx.query(
    `insert into comments (id, client_id, author_id, target_type, target_id, text) values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do nothing`,
    [id, input.clientId, uid, input.targetType, input.targetId, text]));
  // E6: upozornění druhé straně
  const sessionId = input.targetType === 'session' ? input.targetId
    : input.targetType === 'logged_set' ? (await db.query<{ session_id: string }>(`select session_id from logged_sets where id = $1`, [input.targetId]))[0]?.session_id : null;
  const payload = { title: t('coach.notifikaceKomentar'), body: text.slice(0, 120) };
  if (uid === input.clientId) {
    const coaches = await db.query<{ coach_id: string }>(`select coach_id from coach_clients where client_id = $1 and status = 'active'`, [input.clientId]);
    for (const c of coaches) await notifyUser(db, c.coach_id, { ...payload, url: `/trener/klient?id=${input.clientId}` });
  } else {
    await notifyUser(db, input.clientId, { ...payload, url: sessionId ? `/shrnuti?id=${sessionId}` : '/' });
  }
  return id;
}

// --- Odběr upozornění (E6) -----------------------------------------------------------------

export async function saveSubscription(db: Db, uid: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new CoachError('bad_request');
  // endpoint je unikátní: stejné zařízení po přihlášení jiného uživatele přejde na něj
  await db.query(`delete from push_subscriptions where endpoint = $1 and user_id <> $2`, [sub.endpoint, uid]);
  await db.asUser(uid, (tx) => tx.query(
    `insert into push_subscriptions (id, user_id, endpoint, keys) values ($1, $2, $3, $4::jsonb)
     on conflict (endpoint) do update set keys = excluded.keys`, [randomUUID(), uid, sub.endpoint, JSON.stringify(sub.keys)]));
}
