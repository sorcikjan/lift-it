'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { clientData, coachWrite } from '@/client/coach';
import { uuid } from '@/client/uuid';
import { BottomNav } from '@/components/BottomNav';
import { Page, PageTitle, Toast } from '@/components/ui';
import { WorkoutEditor, type EditEx } from '@/components/WorkoutEditor';
import { replaceWorkout, weekTree, type WeekTree } from '@/domain/coach/plan-ops';
import { fmtKg } from '@/domain/format';
import { t } from '@/i18n/t';

export default function CoachWorkoutPage() {
  return <Suspense><CoachWorkout /></Suspense>;
}

/** E3: trenér upraví trénink klienta (cviky z knihovny, série, opakování, váha, poznámka). */
function CoachWorkout() {
  const router = useRouter();
  const params = useSearchParams();
  const clientId = params.get('klient') ?? '';
  const workoutId = params.get('id') ?? '';
  const [tree, setTree] = useState<WeekTree | null>(null);
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<EditEx[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await clientData(clientId);
        const wo = d.workouts.find((w) => w.id === workoutId);
        const tr = wo ? weekTree(wo.week_id, d) : null;
        if (!wo || !tr) { setError(true); return; }
        setTree(tr); setLabel(wo.label);
        const custom = new Map(d.exercises.map((e) => [e.id, e]));
        const pes = tr.exercises.filter((p) => p.workout_id === workoutId);
        const lib = await db().exercises.bulkGet(pes.map((p) => p.exercise_id));
        setItems(pes.map((p, i) => {
          const ex = lib[i] ?? custom.get(p.exercise_id);
          return {
            exerciseId: p.exercise_id, name: p.source_name || exerciseName(ex) || p.exercise_id, type: ex?.type ?? 'weight_reps',
            blok: p.blok, group: p.group_label, note: p.coach_note, sourceName: p.source_name,
            sets: tr.sets.filter((s) => s.planned_exercise_id === p.id).map((s) => ({
              reps: s.reps_max != null ? String(s.reps_max) : '', kg: s.weight_kg != null ? fmtKg(Number(s.weight_kg)) : '', time: s.time_s != null ? String(s.time_s) : '',
            })),
          };
        }));
      } catch { setError(true); }
    })();
  }, [clientId, workoutId]);

  return (
    <Page>
      <PageTitle title={t('import.trenink', { label })} back={`/trener/klient?id=${clientId}`} />
      {error && <Toast tone="info">{t('coach.offline')}</Toast>}
      {items && tree && (
        <WorkoutEditor initial={items} noteField onSave={async (exs) => {
          const r = replaceWorkout(tree, workoutId, exs, uuid);
          try {
            await coachWrite(clientId, {
              planned_exercises: [...r.archived.planned_exercises, ...r.created.planned_exercises],
              planned_sets: [...r.archived.planned_sets, ...r.created.planned_sets],
            });
            router.push(`/trener/klient?id=${clientId}`);
          } catch { setError(true); }
        }} />
      )}
      <BottomNav />
    </Page>
  );
}
