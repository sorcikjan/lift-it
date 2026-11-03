'use client';
/** Trenérská část (E2–E6) běží online proti serveru; data klientů se do zařízení trenéra neukládají. */
import type { PlanRows } from '@/domain/coach/plan-ops';
import type { Exercise, LoggedSet, Measurement, Program, Session, SessionNote } from '@/domain/types';
import type { Change, SyncTable } from '@/shared/sync-tables';
import { authHeader } from './supabase';
import { refreshMe } from './me';

export class ApiError extends Error { constructor(public code: string) { super(code); } }

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined
    ? { headers: await authHeader() }
    : { method: 'POST', headers: { 'content-type': 'application/json', ...(await authHeader()) }, body: JSON.stringify(body) },
  ).catch(() => null);
  if (!res) throw new ApiError('offline');
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(j.error ?? 'unavailable');
  return j as T;
}

export interface ClientSummary { id: string; name: string; email: string; lastSession: string | null; sessions7d: number }
export interface Person { id: string; name: string; email: string }
export interface ClientData extends PlanRows {
  profile: { id: string; name: string; email: string } | null;
  programs: Program[]; sessions: Session[]; logged_sets: LoggedSet[]; session_notes: SessionNote[]; measurements: Measurement[]; exercises: Exercise[];
}
export interface CommentView { id: string; client_id: string; author_id: string; author_name: string; target_type: string; target_id: string; text: string; created_at: string }

export const becomeCoach = async () => { await api('/api/coach/become', {}); await refreshMe(); };
export const createInvite = () => api<{ token: string; url: string }>('/api/coach/invite', {});
export const inviteInfo = (token: string) => api<{ coach_name: string; valid: boolean }>(`/api/coach/invite-info?token=${encodeURIComponent(token)}`);
export const acceptInvite = (token: string) => api<{ coach: string }>('/api/coach/accept', { token });
export const people = () => api<{ clients: ClientSummary[]; coaches: Person[] }>('/api/coach/clients');
export const clientData = (id: string) => api<ClientData>(`/api/coach/client?id=${encodeURIComponent(id)}`);
export const endCoaching = (userId: string) => api('/api/coach/end', { userId });
export const publishWeek = (clientId: string, weekId: string) => api('/api/coach/publish', { clientId, weekId });

export async function coachWrite(clientId: string, rows: Partial<Record<SyncTable, object[]>>) {
  const order: SyncTable[] = ['programs', 'plan_weeks', 'workouts', 'planned_exercises', 'planned_sets'];
  const changes: Change[] = order.flatMap((table) => (rows[table] ?? []).map((row) => ({ table, row: row as Record<string, unknown> })));
  const r = await api<{ applied: string[]; rejected: unknown[] }>('/api/coach/write', { clientId, changes });
  if (r.rejected.length) throw new ApiError('rejected');
}

export const comments = (clientId?: string) => api<{ comments: CommentView[] }>(`/api/comments${clientId ? `?client=${encodeURIComponent(clientId)}` : ''}`);
export const addComment = (c: { id: string; clientId: string; targetType: 'session' | 'logged_set' | 'workout'; targetId: string; text: string }) => api('/api/comments', c);

// --- Upozornění (E6) ---------------------------------------------------------------------------

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
export const pushSupported = () => typeof window !== 'undefined' && !!VAPID && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Na iPhonu jen v appce přidané na plochu (iOS 16.4+). */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported() || (await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) });
  const j = sub.toJSON();
  await api('/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys });
  return true;
}
