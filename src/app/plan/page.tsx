'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { createEmptyWorkout, saveWorkoutEdit, workoutView } from '@/client/repo';
import { BottomNav } from '@/components/BottomNav';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Plus } from '@/components/icons';
import { Button, Page, PageTitle } from '@/components/ui';
import { fmtKg, parseCzNumber, roundKg } from '@/domain/format';
import type { Blok, ExerciseType } from '@/domain/types';
import { t } from '@/i18n/t';

export default function PlanPage() {
  return <Suspense><PlanEditor /></Suspense>;
}

interface EditSet { reps: string; kg: string; time: string }
interface EditEx { exerciseId: string; name: string; type: ExerciseType; blok: Blok; group: string | null; note: string | null; sets: EditSet[] }

/** Ruční vytvoření a úprava tréninku (A6), záloha, když import selže. */
function PlanEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const [workoutId, setWorkoutId] = useState<string | null>(params.get('id'));
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<EditEx[] | null>(null);
  const [adding, setAdding] = useState(false);

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
  const set = (i: number, patch: Partial<EditEx>) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    setItems(n);
  };
  const save = async () => {
    await saveWorkoutEdit(workoutId!, items.map((e) => ({
      exerciseId: e.exerciseId, blok: e.blok, group: e.group, note: e.note,
      sets: e.sets.map((s) => {
        const kg = parseCzNumber(s.kg);
        return { repsMax: e.type === 'time' ? null : parseCzNumber(s.reps), weightKg: kg == null ? null : roundKg(kg), timeS: e.type === 'time' ? parseCzNumber(s.time) : null };
      }),
    })));
    router.push('/');
  };

  return (
    <Page>
      <PageTitle title={t('import.trenink', { label })} back="/" />
      <ul className="flex flex-col gap-3">
        {items.map((e, i) => (
          <li key={i} className="rounded-[18px] bg-grafit p-3" data-testid="edit-exercise">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[18px] font-semibold">{e.name}</p>
              <button type="button" onClick={() => move(i, -1)} aria-label={t('common.nahoru')} className="tap rounded-xl text-ocel">↑</button>
              <button type="button" onClick={() => move(i, 1)} aria-label={t('common.dolu')} className="tap rounded-xl text-ocel">↓</button>
            </div>
            <select value={e.blok} onChange={(ev) => set(i, { blok: ev.target.value as Blok })} aria-label={t('import.pole.blok')}
              className="tap mt-2 w-full rounded-xl border border-linka bg-guma px-3 text-[16px]">
              {(['uvod', 'hlavni', 'zaver'] as const).map((b) => <option key={b} value={b}>{t(`blok.${b}`)}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 text-[14px] text-ocel">
              <span>#</span><span>{e.type === 'time' ? t('import.cas') : t('import.opakovani')}</span><span>{e.type === 'time' ? '' : t('import.vaha')}</span><span />
              {e.sets.map((s, k) => (
                <SetRow key={k} n={k + 1} s={s} type={e.type}
                  onChange={(ns) => set(i, { sets: e.sets.map((x, j) => (j === k ? ns : x)) })}
                  onRemove={() => set(i, { sets: e.sets.filter((_, j) => j !== k) })} />
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => set(i, { sets: [...e.sets, { ...(e.sets.at(-1) ?? { reps: '10', kg: '', time: '30' }) }] })}
                className="tap flex flex-1 items-center justify-center gap-1 rounded-xl border border-linka text-[15px]"><Plus size={18} />{t('import.serie')}</button>
              <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))} className="tap flex-1 rounded-xl border border-linka text-[15px] text-ocel">{t('common.smazat')}</button>
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <ExercisePicker onPick={async (id) => {
          const ex = await db().exercises.get(id);
          setItems([...items, { exerciseId: id, name: exerciseName(ex), type: ex?.type ?? 'weight_reps', blok: 'hlavni', group: null, note: null, sets: [0, 1, 2].map(() => ({ reps: '10', kg: '', time: '30' })) }]);
          setAdding(false);
        }} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="tap mt-3 flex items-center justify-center gap-2 rounded-2xl border border-linka text-[17px]"><Plus size={22} />{t('import.pridatCvik')}</button>
      )}
      <Button big className="mt-5" onClick={save} disabled={!items.length || items.some((e) => !e.sets.length)}>{t('common.ulozit')}</Button>
      <BottomNav />
    </Page>
  );
}

function SetRow({ n, s, type, onChange, onRemove }: { n: number; s: EditSet; type: ExerciseType; onChange: (s: EditSet) => void; onRemove: () => void }) {
  const cls = 'tap w-full rounded-xl border border-linka bg-guma px-3 text-[18px] text-krida tabular';
  return (
    <>
      <span className="font-display text-[18px] text-krida">{n}</span>
      {type === 'time'
        ? <input inputMode="numeric" value={s.time} onChange={(e) => onChange({ ...s, time: e.target.value })} aria-label={t('import.cas')} className={cls} />
        : <input inputMode="numeric" value={s.reps} onChange={(e) => onChange({ ...s, reps: e.target.value })} aria-label={t('import.opakovani')} className={cls} />}
      {type === 'time' ? <span /> : <input inputMode="decimal" value={s.kg} onChange={(e) => onChange({ ...s, kg: e.target.value })} aria-label={t('import.vaha')} className={cls} />}
      <button type="button" onClick={onRemove} aria-label={t('common.odebrat')} className="tap rounded-xl text-ocel">×</button>
    </>
  );
}
