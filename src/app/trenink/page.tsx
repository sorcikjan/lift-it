'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { activeRun, dispatchRun, endWorkoutEarly, lastTimesFor, saveNote, workoutView } from '@/client/repo';
import { useWakeLock } from '@/client/wake-lock';
import { reviveRunState, type RunAction, type RunState } from '@/domain/workout/reducer';
import { deriveRun, type RunCard, type RunRow } from '@/domain/workout/run-view';
import { lastText, upText, type LastTime } from '@/domain/workout/last';
import { figureFor } from '@/domain/figure';
import type { WorkoutView } from '@/domain/types';
import { db } from '@/client/db';
import { uuid } from '@/client/uuid';
import { Check, Plus, Undo } from '@/components/icons';
import { ExerciseFigure } from '@/components/ExerciseFigure';
import { Plates } from '@/components/Plates';
import { t } from '@/i18n/t';

const FLASH_MS = 380;

/**
 * Obrazovka tréninku (B2–B9, redesign 11/2026): jeden seznam cviků. Aktuální cvik je rozsvícená
 * karta s animovanou postavou, cílem, „Minule“ a jedním tlačítkem „Série N hotová“.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutView | null>(null);
  const [state, setState] = useState<RunState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [last, setLast] = useState<Map<string, LastTime>>(new Map());
  const [pick, setPick] = useState(0);
  const [flash, setFlash] = useState(0);
  const lockUntil = useRef(0);
  const cardRef = useRef<HTMLElement>(null);
  const held = useWakeLock(!!state);

  useEffect(() => {
    (async () => {
      const run = await activeRun();
      if (!run) { router.replace('/'); return; }
      const p = await workoutView(run.workout_id);
      if (!p) { router.replace('/'); return; }
      setPlan(p);
      setSessionId(run.session_id);
      setState(reviveRunState(p, run.state));
      setLast(await lastTimesFor(p.exercises.map((e) => e.exerciseId), run.session_id));
    })();
  }, [router]);

  const dispatch = useCallback(async (a: RunAction) => {
    if (!plan) return;
    const { run, finishedSessionId } = await dispatchRun(plan, a);
    if (finishedSessionId) { router.replace(`/shrnuti?id=${finishedSessionId}`); return; }
    if (run) { setState(run.state); setPick(0); }
  }, [plan, router]);

  /** Pojistka proti dvojitému ťuknutí: nové tlačítko na stejném místě chvíli nereaguje. */
  const guarded = (fn: () => void) => {
    if (Date.now() < lockUntil.current) return;
    lockUntil.current = Date.now() + 450;
    fn();
  };

  const prevCard = useRef<string | null>(null);
  const v = plan && state ? deriveRun(plan, state, pick) : null;
  const cardId = v?.card?.peId ?? null;
  useEffect(() => {
    if (!cardId || prevCard.current === cardId) return;
    const first = prevCard.current === null;
    prevCard.current = cardId;
    if (!first) cardRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [cardId]);

  if (!plan || !state || !v) return <main className="min-h-dvh" aria-busy="true" />;

  const end = async () => {
    const sid = await endWorkoutEarly();
    router.replace(sid ? `/shrnuti?id=${sid}` : '/');
  };
  const logSet = () => guarded(() => {
    setFlash(Date.now());
    const index = v.pick;
    setTimeout(() => { void dispatch({ type: 'tap', index, id: uuid(), at: new Date().toISOString() }); }, FLASH_MS);
  });

  const pct = v.setsTotal ? (v.setsDone / v.setsTotal) * 100 : 0;
  const countAria = t('run.serieCountAria', { done: v.setsDone, total: v.setsTotal });
  return (
    <main className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden safe-top" data-phase={v.phase}>
      <header className="flex-none px-5 pb-1">
        <div className="flex min-h-14 items-center justify-between gap-2">
          <h1 className="whitespace-nowrap font-display text-[26px] font-bold">
            {t('import.trenink', { label: plan.label })}
            <span className="ml-2 text-[20px] font-semibold text-ocel tabular">{t('run.serieCount', { done: v.setsDone, total: v.setsTotal })}</span>
          </h1>
          <div className="flex items-center gap-2">
            <span role="img" data-testid="wake" data-held={held} aria-label={held ? t('run.displejDrzi') : t('run.displejNedrzi')}
              className={`flex h-[30px] items-center gap-[7px] whitespace-nowrap rounded-[15px] border px-[11px] text-[13px] ${held ? 'border-splneno/30 bg-splneno/10 text-splneno-svetla' : 'border-linka text-ocel'}`}>
              <span className={`h-[7px] w-[7px] rounded-full ${held ? 'pulse-dot bg-splneno' : 'bg-ocel'}`} />
              {held ? t('run.displejSviti') : t('run.displejZhasne')}
            </span>
            <button type="button" onClick={end} className="press h-10 rounded-xl border border-linka px-3.5 text-[15px] text-ocel">{t('run.ukoncit')}</button>
          </div>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-grafit-2" role="progressbar" aria-label={countAria}
          aria-valuemin={0} aria-valuemax={v.setsTotal} aria-valuenow={v.setsDone}>
          <i className="bar-glow block h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex min-h-12 items-center justify-between gap-2">
          {v.toast ? (
            <span role="status" key={v.toast} className="enter flex min-h-9 items-center gap-2 rounded-[18px] bg-splneno/15 py-1 pl-1.5 pr-3.5 text-[15px] font-semibold text-splneno-svetla">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-splneno text-guma"><Check size={14} /></span>
              {v.toast}
            </span>
          ) : <span />}
          {v.canUndo && (
            <button type="button" onClick={() => guarded(() => void dispatch({ type: 'undo' }))} className="tap -mr-2 flex flex-none items-center gap-1.5 rounded-xl px-2 text-[15px] text-ocel">
              <Undo size={20} />{t('run.zpet')}
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] [scrollbar-width:none]">
        <div className="flex flex-col gap-2">
          {v.doneRows.map((r) => <Row key={r.peId} r={r} />)}
          {v.card && (
            <Card key={v.card.peId} cardRef={cardRef} c={v.card} last={last.get(v.card.exerciseId)} flash={flash} onLog={logSet}
              sessionId={sessionId!} extra={v.canExtraSet} onExtra={() => guarded(() => void dispatch({ type: 'extraSet' }))} />
          )}
          {v.nextRows.length > 0 && <p className="mx-0.5 mt-2.5 text-[12px] font-bold uppercase tracking-[1.2px] text-ocel">{t('run.dal')}</p>}
          {v.nextRows.map((r) => <Row key={r.peId} r={r} onPick={r.pick !== null ? () => setPick(r.pick!) : undefined} />)}
        </div>
      </div>
    </main>
  );
}

function Row({ r, onPick }: { r: RunRow; onPick?: () => void }) {
  const inner = (
    <>
      {r.done
        ? <span className="mx-2 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-splneno text-guma"><Check size={16} /></span>
        : <span className="fig-mini h-9 w-[46px] flex-none opacity-75"><ExerciseFigure kind={figureFor(r.name, r.exerciseId)} /></span>}
      <span className={`min-w-0 flex-1 text-left leading-tight ${r.done ? 'font-medium text-ocel line-through decoration-white/20' : 'font-semibold'}`}>{r.name}</span>
      <span className="whitespace-nowrap font-display text-[17px] font-semibold text-ocel tabular">{r.plan}</span>
    </>
  );
  const cls = `flex min-h-[62px] w-full items-center gap-3 rounded-[18px] border border-hrana px-3.5 py-3 ${r.done ? '' : 'bg-grafit'}`;
  return onPick
    ? <button type="button" data-testid="run-row" onClick={onPick} aria-label={t('run.vybratCvik', { name: r.name })} className={`press ${cls}`}>{inner}</button>
    : <div data-testid="run-row" data-done={r.done} className={cls}>{inner}</div>;
}

function Burst() {
  const cols = ['#34C77B', '#7BE3A9', '#3B7BFF', '#F2F4F1', '#E3B23C'];
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 18, r = 70 + ((i * 37) % 60);
        const style = { background: cols[i % 5], '--x': `${Math.cos(a) * r}px`, '--y': `${Math.sin(a) * r * 0.6 - 20}px`, '--r': `${(i * 53) % 360}deg` } as React.CSSProperties;
        return <i key={i} style={style} />;
      })}
    </span>
  );
}

function Card({ c, last, flash, onLog, sessionId, extra, onExtra, cardRef }: {
  c: RunCard; last: LastTime | undefined; flash: number; onLog: () => void; sessionId: string;
  extra: string | null; onExtra: () => void; cardRef: React.Ref<HTMLElement>;
}) {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (!flash || Date.now() - flash > FLASH_MS) return;
    setBurst(flash);
    const id = setTimeout(() => setBurst(0), FLASH_MS + 60);
    return () => clearTimeout(id);
  }, [flash]);
  const up = last ? upText(last, c.plannedKg) : null;
  const lt = last ? lastText(last) : '';
  const video = `https://www.youtube.com/results?search_query=${encodeURIComponent(c.name)}`;
  return (
    <article ref={cardRef} data-testid="run-card" aria-label={c.name} className="glow-card enter relative flex scroll-mt-2 flex-col gap-3.5 rounded-[28px] p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[1.2px] text-modra-text">{c.blockLabel}</p>
          <h2 className="mt-1 font-display text-[32px] font-bold leading-[0.95]">{c.name}</h2>
        </div>
        {c.tag && <span className="flex h-7 flex-none items-center rounded-[14px] border border-modra-akce/40 bg-modra-akce/15 px-2.5 font-display text-[15px] font-bold text-modra-text">{c.tag}</span>}
      </div>

      <div className="stage relative h-[min(170px,22dvh)] overflow-hidden rounded-[20px]">
        <div className="absolute inset-x-0 bottom-0 top-1.5"><ExerciseFigure kind={figureFor(c.name, c.exerciseId)} /></div>
        <a href={video} target="_blank" rel="noopener" aria-label={t('run.videoAria', { name: c.name })}
          className="absolute bottom-2.5 right-2.5 inline-flex h-[34px] items-center gap-1.5 rounded-[17px] bg-black/65 px-3 text-[13px] font-semibold text-white backdrop-blur">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>{t('run.video')}
        </a>
      </div>

      {c.hint && <p className="text-[15px] leading-snug text-[#B9C2CA]">{c.hint}</p>}
      {c.coachNote && <p className="text-[15px] italic text-[#B9C2CA]">{t('run.trenerPise', { text: c.coachNote })}</p>}

      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-display text-[54px] font-extrabold leading-[0.9] tracking-[-1px] tabular">{c.big}<small className="ml-1 text-[26px] font-semibold tracking-normal text-ocel">{c.bigUnit}</small></span>
        <span className="text-right font-display text-[30px] font-bold tabular">{c.weightLine}</span>
      </div>
      <Plates kg={c.barWeight} className="-mt-2 text-modra-text" />

      <span data-testid="last" className="inline-flex min-h-[34px] flex-wrap items-center gap-x-2 self-start rounded-[17px] bg-white/5 px-3 py-1 text-[14px] text-ocel">
        {lt ? <>{t('run.minule')} <b className="font-semibold text-krida tabular">{lt}</b>{up && <span className="font-bold text-splneno-svetla">{t('run.dnesPlus', { diff: up })}</span>}</> : t('run.poprve')}
      </span>

      <div className="flex items-center gap-2" role="img" aria-label={c.dotsLabel}>
        {c.dots.map((d, i) => (
          <i key={i} className={`h-2 rounded transition-all duration-300 ${d === 'done' ? 'w-7 bg-splneno' : d === 'cur' ? 'w-11 bg-white/40' : 'w-7 bg-grafit-2'}`} />
        ))}
        <span className="ml-1 text-[14px] text-ocel tabular">{c.setNo} / {c.setTotal}</span>
      </div>

      {c.rest && (
        <div role="status" className="enter -mb-1">
          <p className="flex items-center gap-2 font-display text-[22px] font-bold text-splneno-svetla"><Check size={18} />{c.rest.title}</p>
          <p className="mt-0.5 text-[14px] text-ocel">{c.rest.line}</p>
        </div>
      )}

      <button type="button" onClick={onLog} data-testid="log-set"
        className={`press relative flex h-[76px] w-full items-center justify-center gap-3 rounded-[20px] px-4 font-display text-white ${burst ? 'btn-done' : 'btn-glow'}`}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15"><Check size={22} /></span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[28px] font-bold">{c.cta}</span>
          <small className="mt-1 font-sans text-[14px] font-semibold opacity-80">{c.ctaSub}</small>
        </span>
        {burst > 0 && <Burst key={burst} />}
      </button>

      {extra && (
        <button type="button" onClick={onExtra} className="tap -mt-1 flex items-center gap-2 self-start text-[15px] font-semibold text-ocel underline underline-offset-4">
          <Plus size={18} />{t('run.jesteSerie', { name: extra })}
        </button>
      )}
      {c.rest && <Note sessionId={sessionId} exerciseId={c.exerciseId} />}
    </article>
  );
}

function Note({ sessionId, exerciseId }: { sessionId: string; exerciseId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    void db().session_notes.where('session_id').equals(sessionId).toArray()
      .then((ns) => setNote(ns.find((n) => n.exercise_id === exerciseId && !n.archived)?.text ?? ''));
  }, [sessionId, exerciseId]);
  return open ? (
    <textarea autoFocus value={note} onChange={(ev) => setNote(ev.target.value)} onBlur={() => { void saveNote(sessionId, exerciseId, note); setOpen(false); }}
      aria-label={t('run.poznamka')} placeholder={t('run.poznamkaPlaceholder')} rows={2}
      className="w-full rounded-2xl border border-linka bg-guma p-3 text-[16px] text-krida placeholder:text-ocel/70" />
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="tap -my-2 self-start text-[15px] text-ocel underline underline-offset-4">
      {note ? `${t('run.poznamka')}: ${note}` : t('run.poznamka')}
    </button>
  );
}
