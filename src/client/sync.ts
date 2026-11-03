'use client';
/**
 * Offline fronta → server. Zápisy jsou idempotentní upserty podle UUID z klienta,
 * takže opakované odeslání (výpadek uprostřed požadavku) nic nezdvojí.
 */
import { SYNC_ORDER, type SyncResult, type SyncTable } from '@/shared/sync-tables';
import { db, setMeta } from './db';
import { authHeader } from './supabase';
import { onLocalWrite } from './repo';

const BATCH = 300;
let flushing: Promise<void> | null = null;
const statusListeners = new Set<(s: SyncStatus) => void>();

export interface SyncStatus { online: boolean; pending: number; lastError: string | null; lastSync: string | null }
let status: SyncStatus = { online: true, pending: 0, lastError: null, lastSync: null };

function emit(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((fn) => fn(status));
}
export const onSyncStatus = (fn: (s: SyncStatus) => void) => { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); };
export const syncStatus = () => status;

async function refreshPending() {
  emit({ pending: await db().outbox.count() });
}

export function flush(): Promise<void> {
  flushing ??= doFlush().finally(() => { flushing = null; });
  return flushing;
}

async function doFlush() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) { emit({ online: false }); return; }
  for (let round = 0; round < 20; round++) {
    const items = await db().outbox.orderBy('seq').limit(BATCH).toArray();
    if (!items.length) break;
    // Poslední verze každého řádku vyhrává
    const latest = new Map<string, (typeof items)[number]>();
    for (const it of items) latest.set(`${it.table}:${it.row_id}`, it);
    const changes = [...latest.values()].map((it) => ({ table: it.table, row: it.row }));
    let res: Response;
    try {
      res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ changes }),
      });
    } catch {
      emit({ online: false, lastError: 'offline' });
      return;
    }
    if (res.status === 401) { emit({ online: true, lastError: 'unauthorized' }); return; }
    if (!res.ok) { emit({ online: true, lastError: `http_${res.status}` }); return; }
    const result = (await res.json()) as SyncResult;
    const rejected = new Map(result.rejected.map((r) => [`${r.table}:${r.id}`, r.error]));
    const done: number[] = [];
    const retry: { seq: number; attempts: number }[] = [];
    for (const it of items) {
      const key = `${it.table}:${it.row_id}`;
      if (!rejected.has(key) || it.attempts >= 4) done.push(it.seq!);
      else retry.push({ seq: it.seq!, attempts: it.attempts + 1 });
    }
    if (rejected.size) console.warn('[sync] odmítnuto', result.rejected);
    await db().transaction('rw', db().outbox, async () => {
      await db().outbox.bulkDelete(done);
      for (const r of retry) await db().outbox.update(r.seq, { attempts: r.attempts });
    });
    emit({ online: true, lastError: rejected.size ? 'rejected' : null, lastSync: new Date().toISOString() });
    if (retry.length && !done.length) break;
  }
  await refreshPending();
}

/** Stáhne plán a historii ze serveru (jiné zařízení, plán od trenéra). Nepřepíše čekající lokální změny. */
export async function pull(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  let res: Response;
  try {
    res = await fetch('/api/pull', { headers: await authHeader() });
  } catch { return false; }
  if (!res.ok) return false;
  const data = (await res.json()) as Record<string, unknown>;
  const pending = new Set((await db().outbox.toArray()).map((o) => `${o.table}:${o.row_id}`));
  const d = db();
  await d.transaction('rw', [...SYNC_ORDER.map((t) => d.table(t)), d.meta as unknown as ReturnType<typeof d.table>], async () => {
    for (const table of SYNC_ORDER) {
      const rows = (data[table] as { id: string }[] | undefined) ?? [];
      const fresh = rows.filter((r) => !pending.has(`${table}:${r.id}`)).map((r) => normalizeRow(table, r));
      if (fresh.length) await d.table(table).bulkPut(fresh);
    }
    if (data.profile) await setMeta('profile', data.profile);
  });
  await setMeta('lastPull', new Date().toISOString());
  return true;
}

const NUMERIC: Partial<Record<SyncTable, string[]>> = {
  planned_sets: ['weight_kg'], logged_sets: ['weight_kg', 'rpe'],
  measurements: ['weight_kg', 'waist_cm', 'chest_cm', 'hips_cm', 'arm_cm', 'thigh_cm'],
};
function normalizeRow(table: SyncTable, r: Record<string, unknown>) {
  const out = { ...r };
  for (const k of NUMERIC[table] ?? []) if (out[k] != null) out[k] = Number(out[k]);
  return out;
}

let started = false;
/** Spustí synchronizaci: po zápisu, po připojení, při návratu do appky a každých 20 s. */
export function startSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => void flush(), 800); void refreshPending(); };
  onLocalWrite(soon);
  window.addEventListener('online', () => { emit({ online: true }); void flush().then(() => pull()); });
  window.addEventListener('offline', () => emit({ online: false }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void flush(); });
  setInterval(() => void flush(), 20000);
  emit({ online: navigator.onLine });
  void refreshPending();
  void flush().then(() => pull());
}
