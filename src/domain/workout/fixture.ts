import sample from '../../../fixtures/ukazkovy-trenink-a.json';
import type { Blok, ExerciseType, WorkoutView } from '../types';

/** Ukázkový Trénink A z fixtures/ jako WorkoutView (testy a „Vyzkoušet ukázku“). */
export function sampleWorkoutView(): WorkoutView {
  return {
    workoutId: 'sample-a',
    label: 'A',
    exercises: sample.cviky.map((c) => ({
      id: `pe-${c.poradi}`,
      exerciseId: `ex-${c.poradi}`,
      name: c.nazev,
      type: c.typ as ExerciseType,
      blok: c.blok as Blok,
      group: null,
      images: [],
      steps: [],
      coachNote: null,
      sets: Array.from({ length: c.serie }, (_, i) => ({
        id: `ps-${c.poradi}-${i + 1}`,
        number: i + 1,
        repsMin: 'opakovani' in c ? (c.opakovani as number) : null,
        repsMax: 'opakovani' in c ? (c.opakovani as number) : null,
        weightKg: 'vaha_kg' in c ? (c.vaha_kg as number) : null,
        timeS: 'cas_s' in c ? (c.cas_s as number) : null,
        kind: 'working' as const,
        toFailure: false,
      })),
    })),
  };
}
