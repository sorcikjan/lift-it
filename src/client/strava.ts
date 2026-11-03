'use client';
import { setsText } from '@/domain/sets-text';
import { t } from '@/i18n/t';
import { db, getMeta, setMeta } from './db';
import { exerciseName } from './library';
import { updateSession } from './repo';
import { authHeader } from './supabase';

export interface StravaStatus { configured: boolean; connected: boolean; writeDescription: boolean }

async function post(path: string, body: unknown = {}) {
  return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(await authHeader()) }, body: JSON.stringify(body) });
}

/** Stav propojení; offline vrátí poslední známý. */
export async function stravaStatus(): Promise<StravaStatus | null> {
  try {
    const res = await post('/api/strava/status');
    if (!res.ok) return (await getMeta<StravaStatus>('strava')) ?? null;
    const s = (await res.json()) as StravaStatus;
    await setMeta('strava', s);
    return s;
  } catch {
    return (await getMeta<StravaStatus>('strava')) ?? null;
  }
}

export async function connectStrava(): Promise<boolean> {
  const res = await post('/api/strava/connect').catch(() => null);
  if (!res?.ok) return false;
  location.href = (await res.json()).url;
  return true;
}

export async function disconnectStrava() {
  await post('/api/strava/disconnect');
  await setMeta('strava', null);
}

export async function setWriteDescription(on: boolean) {
  await post('/api/strava/settings', { writeDescription: on });
}

/** G4: řádky popisu aktivity, „Leg press 4 × 10, 45 kg“, v pořadí, jak se cvičilo. */
export async function descriptionLines(sessionId: string): Promise<string[]> {
  const sets = (await db().logged_sets.where('session_id').equals(sessionId).toArray()).filter((s) => !s.archived && !s.skipped)
    .sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1));
  const order: string[] = [];
  for (const s of sets) if (!order.includes(s.exercise_id)) order.push(s.exercise_id);
  const pes = new Map((await db().planned_exercises.bulkGet([...new Set(sets.map((s) => s.planned_exercise_id).filter(Boolean) as string[])]))
    .filter(Boolean).map((p) => [p!.exercise_id, p!.source_name]));
  const exs = new Map((await db().exercises.bulkGet(order)).filter(Boolean).map((e) => [e!.id, e!]));
  return order.map((id) => t('strava.popisRadek', {
    name: pes.get(id) || exerciseName(exs.get(id)) || id,
    sets: setsText(sets.filter((s) => s.exercise_id === id).sort((a, b) => a.number - b.number)),
  }));
}

/** Čekání na hodinky: 2 h po konci tréninku se „nenalezeno“ ještě bere jako „čekám na data“. */
const WAIT_MS = 2 * 3600_000;

/** G2: spárovat trénink s aktivitou ve Stravě a uložit tep a kalorie do Session. */
export async function pairSession(sessionId: string): Promise<'paired' | 'waiting' | 'not_found' | 'error'> {
  const s = await db().sessions.get(sessionId);
  if (!s || s.source === 'baseline' || !s.ended_at) return 'error';
  const res = await post('/api/strava/pair', { session: { started_at: s.started_at, ended_at: s.ended_at }, lines: await descriptionLines(sessionId) }).catch(() => null);
  if (!res || !res.ok) return 'error';
  const j = await res.json();
  if (j.status === 'paired') {
    await updateSession(sessionId, { strava_activity_id: j.activityId, pairing_status: 'paired', hr_avg: j.hr_avg, hr_max: j.hr_max, kcal: j.kcal });
    return 'paired';
  }
  const status = Date.now() - new Date(s.ended_at).getTime() < WAIT_MS ? 'waiting' : 'not_found';
  if (s.pairing_status !== status) await updateSession(sessionId, { pairing_status: status });
  return status;
}

/** Po startu appky a po návratu signálu: dopárovat tréninky z posledních 2 dnů. */
export async function pairPending() {
  if (!navigator.onLine) return;
  const st = await stravaStatus();
  if (!st?.connected) return;
  const since = Date.now() - 48 * 3600_000;
  const todo = (await db().sessions.toArray()).filter((s) => s.status === 'done' && !s.archived && s.source !== 'baseline' && s.ended_at
    && new Date(s.ended_at).getTime() > since && (s.pairing_status == null || s.pairing_status === 'waiting'));
  for (const s of todo) await pairSession(s.id);
}
