/**
 * Obrazovka tréninku po redesignu (11/2026): jeden seznam cviků, aktuální cvik je rozsvícená
 * karta s jedním tlačítkem „Série N hotová“. Čísla a texty se berou z deriveView nad stavem,
 * ve kterém by série právě běžela (go / startSet), takže pravidla zůstávají v automatu.
 */
import { planLine, deriveView, type ScreenView } from './view';
import { candidates, reducer, setCount, type RunState } from './reducer';
import type { WorkoutView } from '../types';
import { serie, t } from '@/i18n/t';

export interface RunRow {
  peId: string;
  exerciseId: string;
  name: string;
  plan: string;
  done: boolean;
  /** Index pro akci tap (výběr jiného cviku v hlavní části), jinak null = nejde vybrat. */
  pick: number | null;
}

export interface RunCard {
  peId: string;
  exerciseId: string;
  name: string;
  blockLabel: string;
  tag: string | null;
  hint: string;
  coachNote: string | null;
  big: string;
  bigUnit: string;
  weightLine: string;
  barWeight: number | null;
  plannedKg: number | null;
  setNo: number;
  setTotal: number;
  dots: ScreenView['dots'];
  dotsLabel: string;
  cta: string;
  ctaSub: string;
  isFinal: boolean;
  /** Pauza po sérii: „Série 1 je doma.“ + klidný text; jinak null. */
  rest: { title: string; line: string } | null;
}

export interface RunListView {
  phase: RunState['phase'];
  toast: string | null;
  setsDone: number;
  setsTotal: number;
  doneRows: RunRow[];
  card: RunCard | null;
  /** Index karty pro akci tap. */
  pick: number;
  nextRows: RunRow[];
  canUndo: boolean;
  canExtraSet: string | null;
}

export function deriveRun(plan: WorkoutView, s: RunState, pickWanted = 0): RunListView {
  const E = new Map(plan.exercises.map((e) => [e.id, e]));
  const base = deriveView(plan, s);
  const cand = s.phase === 'next' ? candidates(plan, s) : [];
  const pick = s.phase === 'next' && pickWanted >= 0 && pickWanted < cand.length ? pickWanted : 0;

  // Stav, ve kterém by série běžela: z něj vezmeme cíl, povzbuzení a popisek tlačítka.
  const working = s.phase === 'next' ? reducer(plan, s, { type: 'go', index: pick })
    : s.phase === 'rest' ? reducer(plan, s, { type: 'startSet' }) : s;
  const w = working.phase === 'work' ? deriveView(plan, working) : null;
  const curId = w ? working.order[0] : null;
  const e = curId ? E.get(curId)! : null;

  let card: RunCard | null = null;
  if (e && w) {
    const nextCard = s.phase === 'next' ? base.cards[pick] : null;
    const left = w.setTotal - w.setNo;
    const set = e.sets[Math.min(w.setNo - 1, e.sets.length - 1)];
    card = {
      peId: e.id,
      exerciseId: e.exerciseId,
      name: e.name,
      blockLabel: t(`blok.${e.blok}`) + (e.group ? ` · ${t('run.superserie', { group: e.group })}` : ''),
      tag: nextCard && nextCard.tagKind !== 'next' ? nextCard.tag : null,
      hint: s.phase === 'next' ? (cand.length > 1 && pick === 0 ? t('texty.naRadeVyber') : nextCard!.hint) : s.phase === 'rest' ? '' : w.cheer,
      coachNote: e.coachNote,
      big: w.big,
      bigUnit: w.bigUnit,
      weightLine: w.weightLine,
      barWeight: w.barWeight,
      plannedKg: e.type === 'time' ? null : set?.weightKg ?? null,
      setNo: w.setNo,
      setTotal: w.setTotal,
      dots: w.dots,
      dotsLabel: w.dotsLabel,
      cta: w.isFinal ? t('texty.konec') : t('run.serieNHotova', { n: w.setNo }),
      ctaSub: w.isFinal ? t('run.posledniSerieTreninku')
        : w.supersetNext ? t('run.pakHned', { name: w.supersetNext })
        : left === 0 ? t('run.posledniSerieCviku')
        : t('run.zbyva', { n: left, serie: serie(left) }),
      isFinal: w.isFinal,
      rest: s.phase === 'rest' ? { title: base.restTitle, line: base.restLine } : null,
    };
  }

  const row = (id: string, done: boolean): RunRow => {
    const x = E.get(id)!;
    const ci = cand.indexOf(id);
    return { peId: id, exerciseId: x.exerciseId, name: x.name, plan: planLine(x), done, pick: !done && ci >= 0 && ci !== pick ? ci : null };
  };
  const doneRows = plan.exercises.filter((x) => !s.order.includes(x.id)).map((x) => row(x.id, true));
  const nextRows = s.order.filter((id) => id !== curId).map((id) => row(id, false));
  const setsTotal = plan.exercises.reduce((n, x) => n + setCount(plan, s, x.id), 0);

  return {
    phase: s.phase,
    toast: base.toast,
    setsDone: s.log.length,
    setsTotal,
    doneRows,
    card,
    pick,
    nextRows,
    canUndo: base.canUndo,
    canExtraSet: base.canExtraSet,
  };
}
