'use client';
import type { WritebackEntry } from '@/domain/plan/writeback';
import { parseSheetUrl } from '@/integrations/google-sheets/url';
import { db } from './db';
import { loadImportMapping } from './sheets';
import { authHeader, supabase } from './supabase';

export interface WritebackTarget { sheetUrl: string; sheetTab: string | null; spreadsheetId: string }

/** A9 jde jen u tréninku z importu odkazem na sheet (vložená tabulka nemá kam psát). */
export async function writebackTarget(sessionId: string): Promise<WritebackTarget | null> {
  const s = await db().sessions.get(sessionId);
  const wo = s?.workout_id ? await db().workouts.get(s.workout_id) : undefined;
  const week = wo ? await db().plan_weeks.get(wo.week_id) : undefined;
  if (!week || week.source !== 'sheet' || !week.sheet_url) return null;
  try {
    return { sheetUrl: week.sheet_url, sheetTab: week.sheet_tab, spreadsheetId: parseSheetUrl(week.sheet_url).spreadsheetId };
  } catch { return null; }
}

export async function writebackEntries(sessionId: string): Promise<WritebackEntry[]> {
  const s = await db().sessions.get(sessionId);
  const wo = s?.workout_id ? await db().workouts.get(s.workout_id) : undefined;
  if (!s || !wo) return [];
  const pes = (await db().planned_exercises.where('workout_id').equals(wo.id).toArray()).filter((p) => !p.archived).sort((a, b) => a.position - b.position);
  const sets = (await db().logged_sets.where('session_id').equals(sessionId).toArray()).filter((x) => !x.archived && !x.skipped);
  return pes.map((p) => ({
    workoutLabel: wo.label,
    position: p.position,
    sourceName: p.source_name ?? '',
    sets: sets.filter((x) => x.planned_exercise_id === p.id).sort((a, b) => a.number - b.number).map((x) => ({ reps: x.reps, weight_kg: x.weight_kg, time_s: x.time_s })),
  })).filter((e) => e.sourceName && e.sets.length);
}

export type WritebackResult = { ok: true; column: string | null } | { ok: false; error: string };

export async function writeBack(sessionId: string): Promise<WritebackResult> {
  const target = await writebackTarget(sessionId);
  if (!target) return { ok: false, error: 'not_found' };
  if (!navigator.onLine) return { ok: false, error: 'offline' };
  const mapping = await loadImportMapping(target.spreadsheetId);
  if (!mapping) return { ok: false, error: 'not_found' };
  const session = (await supabase()?.auth.getSession())?.data.session;
  const res = await fetch('/api/sheets/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeader()), ...(session?.provider_token ? { 'x-google-token': session.provider_token } : {}) },
    body: JSON.stringify({ url: target.sheetUrl, tab: target.sheetTab, mapping, entries: await writebackEntries(sessionId) }),
  }).catch(() => null);
  if (!res) return { ok: false, error: 'offline' };
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, column: j.column ?? null } : { ok: false, error: j.error ?? 'unavailable' };
}
