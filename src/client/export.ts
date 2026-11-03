'use client';
import { db } from './db';
import { exerciseName } from './library';
import { t } from '@/i18n/t';

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export všech zalogovaných sérií do CSV (D5). Desetinná čárka, oddělovač středník (Excel v češtině). */
export async function exportCsv(): Promise<{ name: string; csv: string }> {
  const [sets, sessions, workouts, notes] = await Promise.all([
    db().logged_sets.toArray(), db().sessions.toArray(), db().workouts.toArray(), db().session_notes.toArray(),
  ]);
  const S = new Map(sessions.map((s) => [s.id, s]));
  const W = new Map(workouts.map((w) => [w.id, w]));
  const exs = new Map((await db().exercises.bulkGet([...new Set(sets.map((s) => s.exercise_id))])).filter(Boolean).map((e) => [e!.id, e!]));
  const header = ['datum', 'trenink', 'cvik', 'serie', 'opakovani', 'vaha_kg', 'cas_s', 'navic', 's_trenerem', 'poznamka'].map((k) => t(`export.${k}`));
  const rows = sets
    .filter((s) => !s.archived && S.get(s.session_id) && !S.get(s.session_id)!.archived)
    .sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1))
    .map((s) => {
      const sess = S.get(s.session_id)!;
      const note = notes.find((n) => n.session_id === s.session_id && n.exercise_id === s.exercise_id && !n.archived)?.text ?? '';
      return [
        sess.started_at.slice(0, 10), sess.workout_id ? W.get(sess.workout_id)?.label ?? '' : '', exerciseName(exs.get(s.exercise_id)),
        s.number, s.reps ?? '', s.weight_kg == null ? '' : String(s.weight_kg).replace('.', ','), s.time_s ?? '',
        s.extra ? 1 : 0, sess.with_coach ? 1 : 0, note,
      ];
    });
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\n');
  return { name: t('export.soubor', { date: new Date().toISOString().slice(0, 10) }), csv };
}

export function download(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
