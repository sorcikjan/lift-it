'use client';
import sample from '../../fixtures/ukazkovy-trenink-a.json';
import { autoPick, buildMatchIndex, matchExercise, type MatchIndex } from '@/domain/plan/match';
import { normalizeName } from '@/lib/normalize';
import type { DraftWorkout } from '@/domain/plan/parse-sheet';
import type { Blok } from '@/domain/types';
import { db } from './db';
import { ensureLibrary } from './library';
import { mondayOf, saveCustomExercise, saveWeek, type ResolvedWorkout } from './repo';

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

/** Jak import cvik spáruje: jistě, odhadem, nový vlastní cvik, nebo jak ho uživatel vybral. */
export type MatchHow = 'jisty' | 'odhad' | 'novy' | 'vybrany';

export function previewMatch(index: MatchIndex, sourceName: string, pick?: string): { exerciseId: string | null; how: MatchHow } {
  if (pick) return { exerciseId: pick, how: 'vybrany' };
  const m = matchExercise(index, sourceName);
  if (m.exerciseId) return { exerciseId: m.exerciseId, how: 'jisty' };
  const auto = autoPick(m);
  return auto ? { exerciseId: auto, how: 'odhad' } : { exerciseId: null, how: 'novy' };
}

/**
 * Import bez ptaní: jistá shoda nebo dobrý odhad z knihovny; jinak se založí vlastní cvik pod trenérovým názvem
 * (stejný název v jednom importu = jeden cvik, příště ho najde přesná shoda).
 */
export async function resolveForSave(workouts: DraftWorkout[], index: MatchIndex, picks: Record<string, string> = {}): Promise<ResolvedWorkout[]> {
  const created = new Map<string, string>();
  const out: ResolvedWorkout[] = [];
  for (const [wi, w] of workouts.entries()) {
    const exs = [];
    for (const [ei, e] of w.exercises.entries()) {
      let id = previewMatch(index, e.sourceName, picks[`${wi}:${ei}`]).exerciseId;
      if (!id) {
        const key = normalizeName(e.sourceName);
        id = created.get(key) ?? null;
        if (!id) {
          const type = e.sets.some((x) => x.timeS != null) ? 'time' : e.bodyweight ? 'reps' : 'weight_reps';
          id = await saveCustomExercise({ name_cs: e.sourceName.trim(), type });
          created.set(key, id);
        }
      }
      exs.push({ ...e, exerciseId: id });
    }
    out.push({ label: w.label, title: w.title, exercises: exs });
  }
  return out;
}
