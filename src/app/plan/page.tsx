'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createEmptyWorkout, saveWorkoutEdit, workoutView } from '@/client/repo';
import { BottomNav } from '@/components/BottomNav';
import { Page, PageTitle } from '@/components/ui';
import { WorkoutEditor, type EditEx } from '@/components/WorkoutEditor';
import { fmtKg } from '@/domain/format';
import { t } from '@/i18n/t';

export default function PlanPage() {
  return <Suspense><PlanEditor /></Suspense>;
}

/** Ruční vytvoření a úprava tréninku (A6), záloha, když import selže. */
function PlanEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const [workoutId, setWorkoutId] = useState<string | null>(params.get('id'));
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<EditEx[] | null>(null);

  useEffect(() => {
    (async () => {
      let id = workoutId;
      if (!id && params.get('novy')) { id = await createEmptyWorkout(); setWorkoutId(id); }
      if (!id) return;
      const v = await workoutView(id);
      setLabel(v?.label ?? '');
      setItems((v?.exercises ?? []).map((e) => ({
        exerciseId: e.exerciseId, name: e.name, type: e.type, blok: e.blok, group: e.group, note: e.coachNote,
        sets: e.sets.map((s) => ({ reps: s.repsMax != null ? String(s.repsMax) : '', kg: s.weightKg != null ? fmtKg(s.weightKg) : '', time: s.timeS != null ? String(s.timeS) : '' })),
      })));
    })();
  }, [workoutId, params]);

  if (!items) return <Page><p className="pt-10 text-ocel">{t('common.nacitam')}</p></Page>;
  return (
    <Page>
      <PageTitle title={t('import.trenink', { label })} back="/" />
      <WorkoutEditor initial={items} onSave={async (exs) => { await saveWorkoutEdit(workoutId!, exs); router.push('/'); }} />
      <BottomNav />
    </Page>
  );
}
