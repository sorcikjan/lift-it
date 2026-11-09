'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Button, LinkButton, Page } from '@/components/ui';
import { Check, Play, Plus } from '@/components/icons';
import { SyncBadge } from '@/components/SyncBadge';
import { Avatar, Brand, GoogleG } from '@/components/brand';
import { ExerciseFigure } from '@/components/ExerciseFigure';
import { CoachPrompt } from '@/components/CoachPrompt';
import { activeRun, currentWeek, lastTimesFor, previousWorkoutView, startWorkout, workoutView } from '@/client/repo';
import { weekDiff, type ExerciseChange } from '@/domain/workout/week-diff';
import { importSample } from '@/client/importer';
import { onMe, type AuthMode, type Me } from '@/client/me';
import { getMeta, setMeta } from '@/client/db';
import { signInWithGoogle } from '@/client/supabase';
import { figureFor } from '@/domain/figure';
import { listLine } from '@/domain/workout/view';
import { cviku, serie, t } from '@/i18n/t';

const PEEK = 3;
const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

/** Domov (B1, redesign 11/2026): pozdrav, karta dnešního tréninku, stav týdne. Nepřihlášený bez dat vidí vstup. */
export default function Home() {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [withCoach, setWithCoach] = useState(false);
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState<boolean | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<AuthMode>('none');
  const [skip, setSkip] = useState<boolean | null>(null);
  useEffect(() => { const off = onMe((m, md) => { setMe(m); setMode(md); }); return () => { off(); }; }, []);
  useEffect(() => { void getMeta<boolean>('skipLanding').then((v) => setSkip(!!v)); }, []);
  const data = useLiveQuery(async () => {
    const [week, run] = await Promise.all([currentWeek(), activeRun()]);
    const wid = picked ?? run?.workout_id ?? week?.today?.id ?? week?.workouts[0]?.workout.id ?? null;
    const view = wid ? await workoutView(wid) : null;
    // Co je nového: plán proti stejnému tréninku z minulého týdne, jinak proti odcvičenému
    const [prev, last] = view ? await Promise.all([previousWorkoutView(view.workoutId), lastTimesFor(view.exercises.map((e) => e.exerciseId), null)]) : [null, new Map()];
    const diff = weekDiff(view?.exercises ?? [], prev?.exercises ?? null, last);
    return { week, run, view, diff };
  }, [picked]);

  if (!data || skip === null) return <Page><p className="pt-10 text-ocel">{t('common.nacitam')}</p></Page>;
  const { week, run, view, diff } = data;
  const deltas = diff.changes;

  if (mode === 'supabase' && !me && !week && !skip) {
    return <Landing onSkip={async () => { await setMeta('skipLanding', true); setSkip(true); }} />;
  }

  const start = async () => {
    if (!view) return;
    setBusy(true);
    await startWorkout(view.workoutId, withCoach);
    router.push('/trenink');
  };
  const first = me && !me.dev ? me.name?.trim().split(/\s+/)[0] : undefined;
  const hello = first ? t('home.ahoj', { name: vocative(first) }) : t('home.ahojBezJmena');

  if (!week || !view) {
    return (
      <Page>
        <TopBar me={me} />
        <h1 className="rise mt-6 font-display text-[44px] font-extrabold leading-none">{t('home.zadnyPlan')}</h1>
        <p className="rise mt-3 text-[19px] text-ocel" style={delay(1)}>{t('home.zadnyPlanText')}</p>
        <CoachPrompt />
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <LinkButton href="/import" big className="btn-glow shine"><Plus size={28} />{t('home.novyTyden')}</LinkButton>
          <Button variant="ghost" onClick={async () => { setBusy(true); await importSample(); setBusy(false); }} disabled={busy}>{t('home.ukazka')}</Button>
        </div>
        <BottomNav />
      </Page>
    );
  }

  const nSets = view.exercises.reduce((m, e) => m + e.sets.length, 0);
  const est = Math.round(view.exercises.reduce((m, e) => m + e.sets.length * 2.2, 0) + view.exercises.length * 1.5);
  const changed = [...deltas.values()].filter((d) => d.dir !== 'same');
  // Když trenér něco změnil, seznam je rovnou celý, ať je vidět co
  const open = all ?? changed.length > 0;
  const shown = open ? view.exercises : view.exercises.slice(0, PEEK);
  const hero = view.exercises.find((e) => e.blok === 'hlavni') ?? view.exercises[0];
  const count = (dir: string) => [...deltas.values()].filter((d) => d.dir === dir).length;
  const ups = count('up'), news = count('new'), downs = count('down');
  const parts = [ups && t('home.zmenaTezsi', { n: ups }), news && t('home.zmenaNove', { n: news }), downs && t('home.zmenaLehci', { n: downs })].filter(Boolean);
  return (
    <Page>
      <TopBar me={me} />
      <h1 className="rise mt-2.5 font-display text-[42px] font-extrabold leading-none">
        {hello}
        <small className="mt-1.5 block font-sans text-[16px] font-medium text-ocel">{week.today || run ? t('home.podnadpis') : t('home.podnadpisHotovo')}</small>
      </h1>

      <article className="hero-card rise relative mt-[18px] overflow-hidden rounded-[28px] p-[18px]" style={delay(1)}>
        {hero && <div className="pointer-events-none absolute -right-6 top-1 h-[126px] w-[190px] opacity-30" aria-hidden="true"><ExerciseFigure kind={figureFor(hero.name, hero.exerciseId)} /></div>}
        <div className="relative">
          <span className="text-[13px] font-bold uppercase tracking-[1.2px] text-modra-text">{run ? t('home.rozbehnutyTrenink') : t('home.dnesniTrenink')}</span>
          <h2 className="mt-2 font-display text-[46px] font-bold leading-[0.95]">{t('import.trenink', { label: view.label })}</h2>
          <div className="mt-3 flex flex-wrap gap-1.5 tabular">
            {[t('home.cviku', { n: view.exercises.length, cviku: cviku(view.exercises.length) }), t('home.serii', { n: nSets, serie: serie(nSets) }), t('home.minut', { n: est })].map((c) => (
              <span key={c} className="inline-flex h-[30px] items-center rounded-[15px] border border-white/10 bg-white/5 px-3 text-[14px]">{c}</span>
            ))}
          </div>

          {diff.basis && (
            <p data-testid="vs-last" className={`mt-3 text-[15px] font-semibold ${ups || news ? 'text-splneno-svetla' : 'text-ocel'}`}>
              {diff.basis === 'week' ? t('home.oprotiTydnu') : t('home.oprotiMinule')}: {parts.length ? parts.join(' · ') : t('home.zmenaZadna')}
            </p>
          )}

          <ol aria-label={t('home.seznamAria')} className="my-4 flex flex-col">
            {shown.map((e, i) => {
              const l = listLine(e);
              // B14: superserie se v seznamu číslují jako u trenéra (A1, A2)
              const no = e.group ? `${e.group}${view.exercises.filter((x) => x.group === e.group).indexOf(e) + 1}` : String(i + 1);
              return (
                <li key={e.id} className="flex items-center gap-3 border-b border-white/[.06] py-2.5">
                  <span className="w-6 font-display text-[17px] font-semibold text-ocel tabular">{no}</span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/knihovna/cvik?id=${encodeURIComponent(e.exerciseId)}`} className="block truncate text-[16px]">{e.name}</Link>
                    <Change c={deltas.get(e.id)} />
                  </span>
                  <span className="font-display text-[17px] font-semibold text-ocel tabular">{l.sets}</span>
                  <span className="w-[76px] text-right font-display text-[17px] font-semibold text-ocel tabular">{l.weight}</span>
                </li>
              );
            })}
          </ol>
          {view.exercises.length > PEEK && (
            <button type="button" onClick={() => setAll(!open)} className="tap -mt-3 mb-1 w-full text-left text-[15px] text-ocel">
              {open ? t('home.mene') : t('home.dalsich', { n: view.exercises.length - PEEK })}
            </button>
          )}

          {!run && (
            <label className="tap mb-2 flex items-center gap-3 rounded-2xl text-[16px]">
              <input type="checkbox" checked={withCoach} onChange={(e) => setWithCoach(e.target.checked)} className="h-6 w-6 accent-modra-akce" />
              {t('home.sTrenerem')}
            </label>
          )}
          <Button big onClick={start} disabled={busy} className="btn-glow shine press !h-[70px] !text-[28px]"><Play size={24} />{run ? t('home.pokracovat') : t('home.zacit')}</Button>
        </div>
      </article>

      <CoachPrompt />

      <section aria-label={t('home.tentoTyden')} className="rise mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-hrana bg-grafit px-4 py-3" style={delay(2)}>
        <div>
          <p className="text-[14px] text-ocel">{t('home.tentoTyden')}</p>
          <p className="font-display text-[22px] font-bold tabular">{t('home.tydenStav', { done: week.doneCount, total: week.workouts.length })}</p>
        </div>
        <div role="group" aria-label={t('home.tydenAria', { done: week.doneCount, total: week.workouts.length })} className="flex gap-2">
          {week.workouts.map((w) => (
            <button key={w.workout.id} type="button" onClick={() => setPicked(w.workout.id)} aria-pressed={view.workoutId === w.workout.id}
              className={`tap press flex items-center justify-center rounded-2xl font-display text-[22px] font-bold ${w.done ? 'bg-splneno text-guma shadow-[0_0_12px_#34C77B55]' : view.workoutId === w.workout.id ? 'bg-krida text-guma' : 'border-2 border-linka text-ocel'}`}>
              {w.done ? <Check size={24} /> : w.workout.label}
            </button>
          ))}
        </div>
      </section>

      <div className="rise mt-3 flex gap-3" style={delay(3)}>
        <Link href="/import" className="tap flex flex-1 items-center justify-center rounded-2xl border border-linka text-[15px] font-semibold text-ocel">{t('home.novyTyden')}</Link>
        <Link href={`/plan?id=${view.workoutId}`} className="tap flex flex-1 items-center justify-center rounded-2xl border border-linka text-[15px] font-semibold text-ocel">{t('home.upravitTrenink')}</Link>
      </div>
      <p className="mt-4 text-[14px] text-ocel">{t('home.garminTip')}</p>
      <BottomNav />
    </Page>
  );
}

/** Pod názvem cviku: „+2,5 kg · minule 32,5 kg × 8“ nebo „Nový cvik“. */
function Change({ c }: { c?: ExerciseChange }) {
  if (!c || c.dir === 'same') return null;
  if (c.dir === 'new') return <small data-testid="delta" className="block text-[13px] font-semibold text-modra-text">{t('home.novyCvik')}</small>;
  return (
    <small data-testid="delta" className="block text-[13px] tabular">
      <b className={c.dir === 'up' ? 'text-splneno-svetla' : 'text-ocel'}>{c.text}</b>
      {c.was && <span className="text-ocel"> · {t('home.bylo', { was: c.was })}</span>}
    </small>
  );
}

/** Oslovení v 5. pádě pro běžná česká jména („Jan“ → „Jane“, „Jana“ → „Jano“), jinak přibližně. */
function vocative(name: string): string {
  if (/a$/i.test(name)) return name.replace(/a$/i, 'o');
  if (/[eiouyáéíóúůý]$/i.test(name)) return name;
  if (/(k|h|g)$/i.test(name)) return name + 'u';
  if (/(š|ž|č|ř|c|j|ď|ť|ň|x|s|z)$/i.test(name)) return name + 'i';
  return name + 'e';
}

function TopBar({ me }: { me: Me | null }) {
  return (
    <div className="flex min-h-12 items-center justify-between">
      <Brand />
      <div className="flex items-center gap-2">
        <SyncBadge />
        <Avatar name={me && !me.dev ? me.name : null} href="/ucet" />
      </div>
    </div>
  );
}

/** Vstup pro nového uživatele: claim, animovaná postava, přihlášení Googlem. */
function Landing({ onSkip }: { onSkip: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-between px-5 pb-[max(16px,env(safe-area-inset-bottom))] safe-top">
      <div className="rise"><Brand /></div>
      <div>
        <div className="rise relative mx-[-10px] mt-1.5 aspect-[3/2]" style={delay(1)}>
          <div className="absolute inset-[8%_14%] rounded-full bg-[radial-gradient(closest-side,#3B7BFF40,#3B7BFF10_60%,transparent)] blur-md" aria-hidden="true" />
          <ExerciseFigure kind="lat" />
        </div>
        <h1 className="rise font-display text-[clamp(52px,15vw,70px)] font-extrabold leading-[0.9] tracking-[-1px]" style={delay(2)}>
          {t('landing.claim1')} <em className="text-grad not-italic">{t('landing.claim2')}</em>
        </h1>
        <p className="rise mt-3.5 max-w-[32ch] text-[18px] leading-[1.45] text-ocel" style={delay(3)}>{t('landing.lede')}</p>
      </div>
      <div className="rise flex flex-col gap-3 pt-6" style={delay(4)}>
        <button type="button" onClick={() => signInWithGoogle('/')} className="press shine flex h-[66px] w-full items-center justify-center gap-2.5 rounded-[20px] bg-krida font-display text-[26px] font-bold text-[#14171B]">
          <GoogleG />{t('landing.google')}
        </button>
        <p className="text-center text-[13px] text-ocel">{t('landing.fine')}</p>
        <button type="button" onClick={onSkip} className="tap text-[15px] text-ocel underline underline-offset-4">{t('landing.bezUctu')}</button>
      </div>
    </main>
  );
}
