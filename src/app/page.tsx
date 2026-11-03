'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Button, LinkButton, Page } from '@/components/ui';
import { Check, Play, Plus, User } from '@/components/icons';
import { SyncBadge } from '@/components/SyncBadge';
import { activeRun, currentWeek, startWorkout, workoutView } from '@/client/repo';
import { importSample } from '@/client/importer';
import { listLine } from '@/domain/workout/view';
import { cviku, t } from '@/i18n/t';

/** Domov (B1): dnešní trénink, seznam cviků s cíli, stav týdne, Začít trénink. */
export default function Home() {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [withCoach, setWithCoach] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = useLiveQuery(async () => {
    const [week, run] = await Promise.all([currentWeek(), activeRun()]);
    const wid = picked ?? run?.workout_id ?? week?.today?.id ?? week?.workouts[0]?.workout.id ?? null;
    const view = wid ? await workoutView(wid) : null;
    return { week, run, view };
  }, [picked]);

  if (!data) return <Page><p className="pt-10 text-ocel">{t('common.nacitam')}</p></Page>;
  const { week, run, view } = data;

  const start = async () => {
    if (!view) return;
    setBusy(true);
    await startWorkout(view.workoutId, withCoach);
    router.push('/trenink');
  };

  if (!week || !view) {
    return (
      <Page>
        <TopBar />
        <h1 className="mt-6 font-display text-[44px] font-bold leading-none">{t('home.zadnyPlan')}</h1>
        <p className="mt-3 text-[19px] text-ocel">{t('home.zadnyPlanText')}</p>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <LinkButton href="/import" big><Plus size={28} />{t('home.novyTyden')}</LinkButton>
          <Button variant="ghost" onClick={async () => { setBusy(true); await importSample(); setBusy(false); }} disabled={busy}>{t('home.ukazka')}</Button>
        </div>
        <BottomNav />
      </Page>
    );
  }

  const total = week.workouts.length;
  const est = Math.round(view.exercises.reduce((m, e) => m + e.sets.length * 2.2, 0) + view.exercises.length * 1.5);
  return (
    <Page>
      <TopBar />
      <header className="pt-2">
        <p className="font-display text-[22px] font-semibold text-ocel">{run ? t('home.dnes') : week.today ? t('home.dnes') : t('home.hotovyTyden')}</p>
        <h1 className="font-display text-[56px] font-bold leading-none">{t('import.trenink', { label: view.label })}</h1>
        <p className="mt-1 text-[17px] text-ocel tabular">
          {t('home.cviku', { n: view.exercises.length, cviku: cviku(view.exercises.length) })} · {t('home.odhad', { n: est })}
        </p>
      </header>

      <section aria-label={t('home.tentoTyden')} className="mt-5 flex items-center justify-between rounded-[20px] bg-grafit px-4 py-3">
        <div>
          <p className="text-[15px] text-ocel">{t('home.tentoTyden')}</p>
          <p className="font-display text-[24px] font-bold tabular">{t('home.tydenStav', { done: week.doneCount, total })}</p>
        </div>
        <div role="group" aria-label={t('home.tydenAria', { done: week.doneCount, total })} className="flex gap-2">
          {week.workouts.map((w) => (
            <button key={w.workout.id} type="button" onClick={() => setPicked(w.workout.id)} aria-pressed={view.workoutId === w.workout.id}
              className={`tap flex items-center justify-center rounded-2xl font-display text-[22px] font-bold ${w.done ? 'bg-splneno text-guma' : view.workoutId === w.workout.id ? 'bg-krida text-guma' : 'border-2 border-linka text-ocel'}`}>
              {w.done ? <Check size={24} /> : w.workout.label}
            </button>
          ))}
        </div>
      </section>

      <ol aria-label={t('home.seznamAria')} className="mt-4 flex flex-col">
        {view.exercises.map((e, i) => {
          const l = listLine(e);
          // B14: superserie se v seznamu číslují jako u trenéra (A1, A2)
          const no = e.group ? `${e.group}${view.exercises.filter((x) => x.group === e.group).indexOf(e) + 1}` : String(i + 1);
          return (
            <li key={e.id} className="flex items-center gap-3 border-b border-linka py-3 last:border-0">
              <span className="w-8 font-display text-[20px] font-semibold text-ocel tabular">{no}</span>
              <Link href={`/knihovna/cvik?id=${encodeURIComponent(e.exerciseId)}`} className="min-w-0 flex-1 truncate text-[18px] font-semibold">{e.name}</Link>
              <span className="font-display text-[20px] font-semibold tabular">{l.sets}</span>
              <span className="w-[84px] text-right text-[16px] text-ocel tabular">{l.weight}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <Link href="/import" className="tap flex flex-1 items-center justify-center rounded-2xl border border-linka text-[16px] font-semibold text-ocel">{t('home.novyTyden')}</Link>
          <Link href={`/plan?id=${view.workoutId}`} className="tap flex flex-1 items-center justify-center rounded-2xl border border-linka text-[16px] font-semibold text-ocel">{t('home.upravitTrenink')}</Link>
        </div>
        {!run && (
          <label className="tap flex items-center gap-3 rounded-2xl px-1 text-[17px]">
            <input type="checkbox" checked={withCoach} onChange={(e) => setWithCoach(e.target.checked)} className="h-7 w-7 accent-modra-akce" />
            {t('home.sTrenerem')}
          </label>
        )}
        <p className="text-[14px] text-ocel">{t('home.garminTip')}</p>
        <Button big onClick={start} disabled={busy}><Play size={28} />{run ? t('home.pokracovat') : t('home.zacit')}</Button>
      </div>
      <BottomNav />
    </Page>
  );
}

function TopBar() {
  return (
    <div className="flex min-h-12 items-center justify-between">
      <SyncBadge />
      <Link href="/ucet" aria-label={t('auth.ucet')} className="tap -mr-2 flex items-center justify-center text-ocel"><User size={26} /></Link>
    </div>
  );
}
