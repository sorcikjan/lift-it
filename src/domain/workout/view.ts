/**
 * Z čistého stavu odvodí, co karta ukazuje: texty (z cs.json), čísla a tečky.
 * Žádný text tu není natvrdo, jen klíče a proměnné.
 */
import { fmtKg } from '../format';
import type { PlanSetView, WorkoutExerciseView, WorkoutView } from '../types';
import { candidates, setCount, type RunState } from './reducer';
import { cviku, serie, t } from '@/i18n/t';

export function repsText(set: PlanSetView | undefined): string {
  if (!set) return '';
  if (set.toFailure) return t('common.max');
  if (set.repsMin != null && set.repsMax != null && set.repsMin !== set.repsMax) return `${set.repsMin}–${set.repsMax}`;
  return String(set.repsMax ?? set.repsMin ?? '');
}

/** „10×“, „8–10×“, „30 s“, „max“ */
export function whatText(e: WorkoutExerciseView, set: PlanSetView | undefined): string {
  if (!set) return '';
  if (e.type === 'time' || (set.timeS != null && set.repsMax == null)) return `${set.timeS ?? 0} ${t('common.s')}`;
  return set.toFailure ? t('common.max') : `${repsText(set)}×`;
}

function weightRange(e: WorkoutExerciseView): string | null {
  const ws = e.sets.map((s) => s.weightKg).filter((w): w is number => w != null && w > 0);
  if (!ws.length || e.type === 'time') return null;
  const min = Math.min(...ws), max = Math.max(...ws);
  return min === max ? `${fmtKg(min)} kg` : `${fmtKg(min)}–${fmtKg(max)} kg`;
}

/** Řádek plánu na kartě Na řadě: „4 série · 10× · 40 kg“ */
export function planLine(e: WorkoutExerciseView): string {
  const n = e.sets.length;
  const first = e.sets[0];
  const reps = new Set(e.sets.map((s) => whatText(e, s)));
  const what = reps.size === 1 ? whatText(e, first) : e.sets.map((s) => whatText(e, s).replace('×', '')).join('/') + (e.type === 'time' ? '' : '×');
  const w = weightRange(e);
  return t('run.plan', { sets: n, serie: serie(n), what }) + (w ? ` · ${w}` : '');
}

/** Krátký zápis do seznamu na domově: „3 × 8“, „35 kg“ */
export function listLine(e: WorkoutExerciseView): { sets: string; weight: string } {
  const what = whatText(e, e.sets[0]).replace('×', '');
  const w = weightRange(e);
  return {
    sets: `${e.sets.length} × ${what}`,
    weight: w ?? (e.type === 'time' ? t('common.bezZateze') : t('common.vlastniVaha')),
  };
}

export interface CardView {
  peId: string;
  name: string;
  tag: string;
  tagKind: 'next' | 'back' | 'alt';
  blockLabel: string;
  plan: string;
  hint: string;
  images: string[];
  steps: string[];
  coachNote: string | null;
  nameSize: number;
}

export interface ScreenView {
  phase: RunState['phase'];
  header: string;
  exerciseNo: number;
  total: number;
  toast: string | null;
  cards: CardView[];
  current: WorkoutExerciseView | null;
  setNo: number;
  setTotal: number;
  dots: ('done' | 'cur' | 'todo')[];
  dotsLabel: string;
  big: string;
  bigUnit: string;
  weightLine: string;
  targetAria: string;
  cheer: string;
  ctaLabel: string;
  isFinal: boolean;
  restTitle: string;
  restLine: string;
  nextSetLabel: string;
  nextSet: string;
  thenText: string;
  doneCount: number;
  progress: ('done' | 'cur' | 'todo')[];
  progressLabel: string;
  canUndo: boolean;
  canExtraSet: string | null;  // název cviku pro sérii navíc
  supersetNext: string | null;
}

const nameSize = (name: string) => (name.length > 22 ? 34 : name.length > 12 ? 42 : 52);

export function deriveView(plan: WorkoutView, s: RunState): ScreenView {
  const E = new Map(plan.exercises.map((e) => [e.id, e]));
  const total = plan.exercises.length;
  const finishedIds = plan.exercises.filter((e) => !s.order.includes(e.id)).length;
  const doneCount = Math.min(finishedIds, total);
  const id = s.order[0];
  const e = id ? E.get(id) ?? null : null;
  const done = id ? s.done[id] ?? 0 : 0;
  const count = id ? setCount(plan, s, id) : 0;
  const cand = candidates(plan, s);

  const cards: CardView[] = cand.map((k, i) => {
    const x = E.get(k)!;
    const isBack = s.deferred.includes(k);
    let hint: string;
    if (cand.length === 1) {
      hint = x.blok === 'uvod' ? t('texty.naRadeUvod') : x.blok === 'zaver' ? t('texty.naRadeZaver') : t('texty.naRade');
    } else if (i === 0) hint = t('texty.naRadeSvihni');
    else hint = t('texty.naRadePocka', { name: E.get(cand[0])!.name });
    return {
      peId: k,
      name: x.name,
      tag: i === 0 ? (isBack ? t('run.vracimeSe') : t('run.naRade')) : t('run.neboTohle'),
      tagKind: i === 0 ? (isBack ? 'back' : 'next') : 'alt',
      blockLabel: t(`blok.${x.blok}`),
      plan: planLine(x),
      hint,
      images: x.images,
      steps: x.steps.slice(0, 3),
      coachNote: x.coachNote,
      nameSize: nameSize(x.name),
    };
  });

  const set = e ? e.sets[Math.min(done, e.sets.length - 1)] : undefined;
  const lastSetOfExercise = done + 1 === count;
  // Superserie: poslední série tréninku je jen tehdy, když už nic jiného nezbývá.
  const othersLeft = s.order.slice(1).some((k) => (s.done[k] ?? 0) < setCount(plan, s, k));
  const isFinal = s.phase === 'work' && lastSetOfExercise && !othersLeft;
  const isTime = e?.type === 'time';
  const hasW = !!set && !isTime && (set.weightKg ?? 0) > 0;
  const what = e ? whatText(e, set) : '';

  let cheer: string;
  if (isFinal) cheer = t('texty.posledniSerieTreninku');
  else if (lastSetOfExercise) cheer = t('texty.posledniSerie');
  else if (done === 0) cheer = t('texty.prvniSerie');
  else if (done + 2 === count) cheer = t('texty.predposledni');
  else cheer = t('texty.uprostred');

  const restTitles = [t('texty.pauza1', { n: done }), t('texty.pauza2'), t('texty.pauza3')];
  const after = s.order[1] ? E.get(s.order[1])!.name : '';
  let thenText: string;
  if (s.phase === 'next') {
    thenText = cand.length > 1
      ? t('run.veFronte', { n: s.order.length - 1, cviku: cviku(s.order.length - 1) })
      : after ? t('run.pak', { name: after }) : t('run.posledniCvik');
  } else {
    thenText = after
      ? s.deferred.includes(s.order[1]) ? t('run.pakVracimeSe', { name: after }) : t('run.pak', { name: after })
      : t('run.posledniCvik');
  }

  const progress = plan.exercises.map((_, i) => (i < doneCount ? 'done' : i === doneCount ? 'cur' : 'todo') as 'done' | 'cur' | 'todo');
  const dots = Array.from({ length: count }, (_, j) => (j < done ? 'done' : j === done ? 'cur' : 'todo') as 'done' | 'cur' | 'todo');

  let toast: string | null = null;
  if (s.phase === 'next') {
    toast = s.lastDone ? t('texty.cvikHotovy', { name: E.get(s.lastDone)?.name ?? '' }) : s.log.length === 0 ? t('texty.start') : null;
  }

  const partner = e?.group
    ? plan.exercises.find((x) => x.group === e.group && x.id !== e.id && s.order.includes(x.id) && (s.done[x.id] ?? 0) <= done)
    : undefined;

  return {
    phase: s.phase,
    header: t('run.hlavicka', { label: plan.label, n: Math.min(doneCount + 1, total), total }),
    exerciseNo: Math.min(doneCount + 1, total),
    total,
    toast,
    cards,
    current: e,
    setNo: done + 1,
    setTotal: count,
    dots,
    dotsLabel: t('run.hotoveSerieAria', { done, total: count }),
    big: isTime ? String(set?.timeS ?? 0) : set?.toFailure ? t('common.max') : repsText(set),
    bigUnit: isTime ? t('common.s') : set?.toFailure ? '' : '×',
    weightLine: hasW ? t('run.naKg', { w: fmtKg(set!.weightKg!) }) : isTime ? t('common.vydrz') : t('common.vlastniVaha'),
    targetAria: t('run.tedAria', { what: what + (hasW ? ' ' + t('run.naKg', { w: fmtKg(set!.weightKg!) }) : '') }),
    cheer,
    ctaLabel: isFinal ? t('texty.konec') : lastSetOfExercise ? t('run.serieICvikHotovy') : t('run.serieHotova'),
    isFinal,
    restTitle: restTitles[Math.max(0, done - 1) % 3],
    restLine: t('texty.pauzaText'),
    nextSetLabel: t('run.dalsiSerie', { n: done + 1, total: count }),
    nextSet: what + (hasW ? ' ' + t('run.naKg', { w: fmtKg(set!.weightKg!) }) : ''),
    thenText,
    doneCount,
    progress,
    progressLabel: t('run.hotoveCvikyAria', { done: doneCount, total }),
    canUndo: s.history.length > 0,
    canExtraSet: s.phase === 'next' && s.lastDone ? E.get(s.lastDone)?.name ?? null : null,
    supersetNext: s.phase === 'work' && partner ? partner.name : null,
  };
}
