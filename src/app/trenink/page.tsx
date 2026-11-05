'use client';
import { Plates } from '@/components/Plates';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { activeRun, dispatchRun, endWorkoutEarly, saveNote, workoutView } from '@/client/repo';
import { useWakeLock } from '@/client/wake-lock';
import { reviveRunState, type RunAction, type RunState } from '@/domain/workout/reducer';
import { deriveView, type CardView, type ScreenView } from '@/domain/workout/view';
import type { WorkoutView } from '@/domain/types';
import { db } from '@/client/db';
import { uuid } from '@/client/uuid';
import { Check, Moon, Play, Plus, Sun, Undo } from '@/components/icons';
import { ExerciseImages } from '@/components/ExerciseImages';
import { t } from '@/i18n/t';

/** Obrazovka tréninku (B2–B9): jedna karta cviku ve stavech Na řadě, Cvičím, Vydýchej se. */
export default function TrainingScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutView | null>(null);
  const [state, setState] = useState<RunState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const lockUntil = useRef(0);
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
    })();
  }, [router]);

  const dispatch = useCallback(async (a: RunAction) => {
    if (!plan) return;
    // Pojistka proti dvojitému ťuknutí: nové tlačítko na stejném místě chvíli nereaguje.
    if (Date.now() < lockUntil.current) return;
    lockUntil.current = Date.now() + 450;
    const { run, finishedSessionId } = await dispatchRun(plan, a);
    if (finishedSessionId) { router.replace(`/shrnuti?id=${finishedSessionId}`); return; }
    if (run) setState(run.state);
  }, [plan, router]);

  if (!plan || !state) return <main className="min-h-dvh bg-guma" aria-busy="true" />;
  const v = deriveView(plan, state);

  const end = async () => {
    const sid = await endWorkoutEarly();
    router.replace(sid ? `/shrnuti?id=${sid}` : '/');
  };

  return (
    <main className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden bg-guma safe-top safe-bottom" data-phase={v.phase}>
      <div className="flex h-14 flex-none items-center justify-between gap-2 px-4">
        <p className="font-display text-[22px] font-semibold text-ocel tabular">
          {t('run.hlavickaPrefix', { label: plan.label })}<span className="text-krida">{v.exerciseNo}</span>{t('run.hlavickaSuffix', { total: v.total })}
        </p>
        <div className="flex items-center gap-1">
          <span role="img" aria-label={held ? t('run.displejDrzi') : t('run.displejNedrzi')} title={held ? t('run.displejDrzi') : t('run.displejNedrzi')}
            data-testid="wake" data-held={held} className={`flex h-14 w-10 items-center justify-center ${held ? 'text-splneno' : 'text-ocel'}`}>
            {held ? <Sun size={22} /> : <Moon size={22} />}
          </span>
          <button type="button" onClick={end} className="tap rounded-xl border border-linka px-4 text-[16px] font-medium text-ocel">{t('run.ukoncit')}</button>
        </div>
      </div>

      <div className="flex h-11 flex-none items-center justify-between gap-2 px-4">
        {v.toast ? (
          <span role="status" className="flex h-10 items-center gap-2.5 rounded-[20px] bg-splneno pl-2 pr-4 text-[17px] font-bold text-guma">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-guma text-splneno"><Check size={15} /></span>
            {v.toast}
          </span>
        ) : <span />}
        {v.canUndo && (
          <button type="button" onClick={() => dispatch({ type: 'undo' })} className="tap -mr-2 flex items-center gap-1.5 rounded-xl px-2 text-[15px] text-ocel">
            <Undo size={20} />{t('run.zpet')}
          </button>
        )}
      </div>

      {v.phase === 'next' && <NextCards v={v} onGo={(i) => dispatch({ type: 'go', index: i })} onExtra={() => dispatch({ type: 'extraSet' })} />}
      {v.phase === 'work' && <WorkCard v={v} onLog={() => dispatch({ type: 'logSet', id: uuid(), at: new Date().toISOString() })} />}
      {v.phase === 'rest' && <RestCard v={v} sessionId={sessionId!} onNext={() => dispatch({ type: 'startSet' })} />}

      <div className="mt-3 flex h-14 flex-none items-center justify-between gap-3 px-4">
        <p className="min-w-0 truncate text-[16px] text-ocel">{v.thenText}</p>
        <span role="img" aria-label={v.progressLabel} className="flex flex-none gap-1">
          {v.progress.map((p, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${p === 'done' ? 'bg-splneno' : p === 'cur' ? 'bg-krida' : 'bg-linka'}`} />
          ))}
        </span>
      </div>
    </main>
  );
}

function NextCards({ v, onGo, onExtra }: { v: ScreenView; onGo: (i: number) => void; onExtra: () => void }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => { row.current?.scrollTo({ left: 0 }); }, [v.cards[0]?.peId]);
  return (
    <div ref={row} aria-label={t('run.karuselAria')} data-testid="carousel"
      className="snap-row mt-1 flex min-h-0 flex-1 gap-2.5 overflow-x-auto pl-4">
      {v.cards.map((c, i) => <NextCard key={c.peId} c={c} single={v.cards.length === 1} onGo={() => onGo(i)} extra={i === 0 ? v.canExtraSet : null} onExtra={onExtra} />)}
      <div className="w-1.5 flex-none" />
    </div>
  );
}

function NextCard({ c, single, onGo, extra, onExtra }: { c: CardView; single: boolean; onGo: () => void; extra: string | null; onExtra: () => void }) {
  const tagCls = c.tagKind === 'alt' ? 'bg-zluta text-guma' : 'bg-guma text-krida';
  return (
    <article data-testid="card-next" aria-label={c.name}
      className={`snap-start-card flex min-h-0 flex-none flex-col overflow-hidden rounded-[28px] bg-krida p-[18px] text-guma ${single ? 'w-[calc(100%-16px)]' : 'w-[326px] max-w-[calc(100vw-48px)]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-[30px] items-center rounded-[15px] px-3 font-display text-[17px] font-bold ${tagCls}`}>{c.tag}</span>
        <span className="font-display text-[17px] font-semibold text-[#5A636B]">{c.blockLabel}</span>
      </div>
      <div className="card-body">
      <h1 className="mt-4 font-display font-bold leading-none" style={{ fontSize: `min(${c.nameSize}px, ${c.nameSize / 9}dvh)` }}>{c.name}</h1>
      <ExerciseImages images={c.images} name={c.name} />
      <p className="mt-4 font-display text-[30px] font-bold tabular">{c.plan}</p>
      <p className="mt-2.5 text-[16px] leading-snug text-[#3A4148]">{c.hint}</p>
      {c.coachNote && <p className="mt-1 text-[15px] italic text-[#3A4148]">{t('run.trenerPise', { text: c.coachNote })}</p>}
      {extra && (
        <button type="button" onClick={onExtra} className="tap mt-2 flex items-center gap-2 self-start rounded-xl text-[15px] font-semibold text-[#3A4148] underline underline-offset-4">
          <Plus size={18} />{t('run.jesteSerie', { name: extra })}
        </button>
      )}
      </div>
      <button type="button" onClick={onGo}
        className="card-cta flex w-full flex-none items-center justify-center gap-3 rounded-[20px] bg-modra-akce font-display text-[32px] font-bold text-krida">
        <Play size={26} />{t('run.jduNaTo')}
      </button>
    </article>
  );
}

function Dots({ dots, label, tone }: { dots: ScreenView['dots']; label: string; tone: 'blue' | 'yellow' }) {
  return (
    <span role="img" aria-label={label} className="flex gap-2">
      {dots.map((d, i) => d === 'done' ? (
        <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-splneno text-guma ${tone === 'blue' ? 'border-krida' : 'border-guma'}`}><Check size={13} /></span>
      ) : d === 'cur' ? (
        <span key={i} className={`h-6 w-6 rounded-full ${tone === 'blue' ? 'border-[3px] border-krida' : 'border-2 border-dashed border-guma'}`} />
      ) : (
        <span key={i} className={`h-6 w-6 rounded-full border-2 ${tone === 'blue' ? 'border-[#7FA2E8]' : 'border-[#8C6A1C]'}`} />
      ))}
    </span>
  );
}

function WorkCard({ v, onLog }: { v: ScreenView; onLog: () => void }) {
  const e = v.current!;
  const bigSize = v.big.length > 3 ? 120 : 200;
  return (
    <article data-testid="card-work" className="mx-4 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-modra-karta p-[18px] text-krida">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-[30px] items-center rounded-[15px] bg-krida/20 px-3 font-display text-[17px] font-bold">{t('run.cvicim')}</span>
        <Dots dots={v.dots} label={v.dotsLabel} tone="blue" />
      </div>
      <div className="card-body">
      <p className="mt-4 font-display text-[24px] font-semibold leading-tight text-modra-svetla">{e.name}</p>
      <p className="mt-0.5 font-display text-[34px] font-bold tabular">{t('run.serieXzeY', { n: v.setNo, total: v.setTotal })}</p>
      <p aria-label={v.targetAria} className="mt-3.5 flex items-baseline gap-1.5 whitespace-nowrap font-display leading-[0.85] tabular">
        <span className="font-bold tracking-[-4px]" style={{ fontSize: `min(${bigSize}px, ${bigSize / 8.5}dvh)` }}>{v.big}</span>
        <span className="text-[64px] font-semibold text-modra-svetla">{v.bigUnit}</span>
      </p>
      <p className="mt-2.5 font-display text-[32px] font-bold tabular">{v.weightLine}</p>
      <Plates kg={v.barWeight} className="mt-1.5 text-modra-svetla" />
      <p className="mt-4 text-[19px] font-medium">{v.cheer}</p>
      {v.supersetNext && <p className="mt-1 text-[16px] text-modra-svetla">{t('run.superserieDalsi', { name: v.supersetNext })}</p>}
      </div>
      <button type="button" onClick={onLog} data-testid="log-set"
        className="card-cta flex w-full flex-none items-center justify-center gap-3 rounded-[20px] bg-splneno font-display text-[32px] font-bold text-guma">
        <Check size={28} />{v.ctaLabel}
      </button>
    </article>
  );
}

function RestCard({ v, sessionId, onNext }: { v: ScreenView; sessionId: string; onNext: () => void }) {
  const e = v.current!;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    void db().session_notes.where('session_id').equals(sessionId).toArray()
      .then((ns) => setNote(ns.find((n) => n.exercise_id === e.exerciseId && !n.archived)?.text ?? ''));
  }, [sessionId, e.exerciseId]);
  return (
    <article data-testid="card-rest" className="mx-4 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-zluta p-[18px] text-guma">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-[30px] items-center rounded-[15px] bg-guma px-3 font-display text-[17px] font-bold text-zluta">{t('run.vydychejSe')}</span>
        <Dots dots={v.dots} label={v.dotsLabel} tone="yellow" />
      </div>
      <div className="card-body">
      <p className="mt-4 font-display text-[24px] font-semibold leading-tight text-zluta-tmava">{e.name}</p>
      <div className="mt-2.5 flex items-center gap-3.5">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full border-[3px] border-guma bg-splneno text-guma"><Check size={34} /></span>
        <h1 className="font-display font-bold leading-[0.95]" style={{ fontSize: 'min(52px, 6.2dvh)' }}>{v.restTitle}</h1>
      </div>
      <p className="mt-3.5 text-[20px] font-medium leading-snug text-[#2A2209]">{v.restLine}</p>
      <div className="mt-[min(24px,2.5dvh)] rounded-[18px] bg-guma/10 p-4">
        <p className="text-[15px] font-semibold text-zluta-tmava">{v.nextSetLabel}</p>
        <p className="mt-1 font-display text-[40px] font-bold tabular">{v.nextSet}</p>
        <Plates kg={v.barWeight} className="mt-1 text-zluta-tmava" />
      </div>
      {noteOpen ? (
        <textarea autoFocus value={note} onChange={(ev) => setNote(ev.target.value)} onBlur={() => { void saveNote(sessionId, e.exerciseId, note); setNoteOpen(false); }}
          aria-label={t('run.poznamka')} placeholder={t('run.poznamkaPlaceholder')} rows={2}
          className="mt-3 w-full rounded-2xl bg-krida/70 p-3 text-[17px] text-guma placeholder:text-zluta-tmava/70" />
      ) : (
        <button type="button" onClick={() => setNoteOpen(true)} className="tap mt-2 self-start text-[16px] font-semibold text-zluta-tmava underline underline-offset-4">
          {note ? `${t('run.poznamka')}: ${note}` : t('run.poznamka')}
        </button>
      )}
      </div>
      <button type="button" onClick={onNext}
        className="card-cta flex w-full flex-none items-center justify-center gap-3 rounded-[20px] bg-guma font-display text-[32px] font-bold text-krida">
        <Play size={26} />{t('run.jduNaDalsiSerii')}
      </button>
    </article>
  );
}
