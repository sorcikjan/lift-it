'use client';
import sample from '../../fixtures/ukazkovy-trenink-a.json';
import { buildMatchIndex, matchExercise, type MatchIndex } from '@/domain/plan/match';
import type { DraftWorkout } from '@/domain/plan/parse-sheet';
import type { Blok } from '@/domain/types';
import { db } from './db';
import { ensureLibrary } from './library';
import { mondayOf, saveWeek, type ResolvedWorkout } from './repo';

export async function loadMatchIndex(): Promise<MatchIndex> {
  await ensureLibrary();
  const [exercises, aliases] = await Promise.all([db().exercises.toArray(), db().exercise_aliases.toArray()]);
  return buildMatchIndex({ exercises, aliases });
}

/** Ukázkový Trénink A z fixtures/ (když ještě není plán od trenéra). */
export async function importSample(): Promise<string> {
  const index = await loadMatchIndex();
  const draft: DraftWorkout = {
    label: 'A',
    title: sample.nazev,
    exercises: sample.cviky.map((c, i) => ({
      row: i, sourceName: c.nazev, blok: c.blok as Blok, group: null, restS: null, note: null, issues: [], bodyweight: !('vaha_kg' in c),
      sets: Array.from({ length: c.serie }, () => ({
        repsMin: 'opakovani' in c ? (c.opakovani as number) : null,
        repsMax: 'opakovani' in c ? (c.opakovani as number) : null,
        weightKg: 'vaha_kg' in c ? (c.vaha_kg as number) : null,
        timeS: 'cas_s' in c ? (c.cas_s as number) : null,
        toFailure: false,
      })),
    })),
  };
  const resolved = resolveAll([draft], index);
  if (!resolved) throw new Error('sample_unmatched');
  return saveWeek({ workouts: resolved, weekStart: mondayOf(), source: 'manual', raw: sample });
}

/** Když má každý cvik jistou shodu, vrátí vyřešené tréninky; jinak null. */
export function resolveAll(workouts: DraftWorkout[], index: MatchIndex, picks: Record<string, string> = {}): ResolvedWorkout[] | null {
  const out: ResolvedWorkout[] = [];
  for (const [wi, w] of workouts.entries()) {
    const exs = [];
    for (const [ei, e] of w.exercises.entries()) {
      const id = picks[`${wi}:${ei}`] ?? matchExercise(index, e.sourceName).exerciseId;
      if (!id) return null;
      exs.push({ ...e, exerciseId: id });
    }
    out.push({ label: w.label, title: w.title, exercises: exs });
  }
  return out;
}
