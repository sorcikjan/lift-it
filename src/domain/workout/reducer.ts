/**
 * Stavový automat obrazovky tréninku (PRD, kapitola Flow tréninku; logika podle
 * docs/prototype/Karta.dc.html: candidates, go, logSet).
 *
 *   Na řadě (next) --go--> Cvičím (work) --logSet--> Vydýchej se (rest) --startSet--> Cvičím
 *   Po poslední sérii cviku logSet vede rovnou na další kartu Na řadě (bez pauzy).
 *   Po poslední sérii tréninku logSet vede na finished (shrnutí).
 *   tap = go/startSet + logSet jedním ťuknutím (obrazovka tréninku od redesignu 11/2026).
 *
 * Čistá funkce: id a čas nové série přicházejí v akci, takže reducer nic negeneruje.
 * Stav je čisté JSON a ukládá se do IndexedDB po každé akci (B9).
 */
import type { WorkoutView } from '../types';

export type Phase = 'next' | 'work' | 'rest' | 'finished';

export interface LogEntry {
  id: string;        // UUID LoggedSet
  peId: string;      // planned_exercise_id
  setIndex: number;  // 0 = první série cviku
  at: string;        // ISO čas zápisu
  extra: boolean;    // série navíc mimo plán (B15)
}

export interface RunCore {
  order: string[];               // zbývající cviky, aktuální první
  deferred: string[];            // přeskočené kvůli obsazenému stroji
  done: Record<string, number>;  // počet hotových sérií na cvik
  extra: Record<string, number>; // série navíc na cvik
  phase: Phase;
  lastDone: string | null;       // pro pochvalu „… máš v kapse!“
  log: LogEntry[];
}

export interface RunState extends RunCore {
  history: RunCore[];            // pro tlačítko Zpět (bez dialogů)
}

export type RunAction =
  | { type: 'go'; index: number }
  | { type: 'logSet'; id: string; at: string }
  | { type: 'startSet' }
  | { type: 'tap'; index: number; id: string; at: string }
  | { type: 'undo' }
  | { type: 'extraSet' };

const HISTORY_LIMIT = 50;

export function initRunState(plan: WorkoutView): RunState {
  return {
    order: plan.exercises.map((e) => e.id),
    deferred: [],
    done: {},
    extra: {},
    phase: plan.exercises.length ? 'next' : 'finished',
    lastDone: null,
    log: [],
    history: [],
  };
}

const byId = (plan: WorkoutView) => new Map(plan.exercises.map((e) => [e.id, e]));

/** Počet sérií cviku včetně sérií navíc. */
export function setCount(plan: WorkoutView, s: RunCore, peId: string): number {
  const e = byId(plan).get(peId);
  return (e?.sets.length ?? 0) + (s.extra[peId] ?? 0);
}

/**
 * Karty, ze kterých jde na Na řadě vybrat. Mimo hlavní část jen aktuální cvik
 * (úvod a závěr jedou podle plánu); v hlavní části všechny zbývající cviky hlavní části.
 */
export function candidates(plan: WorkoutView, s: RunCore): string[] {
  const E = byId(plan);
  const first = s.order[0];
  if (!first) return [];
  if (E.get(first)?.blok !== 'hlavni') return [first];
  return s.order.filter((k) => E.get(k)?.blok === 'hlavni');
}

/** Superserie (B14): další člen stejné skupiny, který má ještě sérii stejného pořadí. */
function supersetPartner(plan: WorkoutView, s: RunCore, peId: string): string | null {
  const E = byId(plan);
  const group = E.get(peId)?.group;
  if (!group) return null;
  const members = plan.exercises.filter((e) => e.group === group).map((e) => e.id);
  const idx = members.indexOf(peId);
  const doneHere = s.done[peId] ?? 0; // už po zápisu
  for (let i = 1; i < members.length; i++) {
    const m = members[(idx + i) % members.length];
    if (!s.order.includes(m)) continue;
    const dm = s.done[m] ?? 0;
    if (dm < doneHere && dm < setCount(plan, s, m)) return m;
  }
  return null;
}

function snapshot(s: RunState): RunCore {
  const { history: _h, ...core } = s;
  return core;
}

function push(s: RunState, next: RunCore): RunState {
  const history = [...s.history, snapshot(s)].slice(-HISTORY_LIMIT);
  return { ...next, history };
}

export function reducer(plan: WorkoutView, s: RunState, a: RunAction): RunState {
  switch (a.type) {
    case 'go': {
      if (s.phase !== 'next') return s;
      const c = candidates(plan, s);
      if (!Number.isInteger(a.index) || a.index < 0 || a.index >= c.length) return s;
      const id = c[a.index];
      const skipped = c.slice(0, a.index);
      const rest = s.order.filter((k) => k !== id && !skipped.includes(k));
      const deferred = s.deferred.filter((k) => k !== id);
      for (const k of skipped) if (!deferred.includes(k)) deferred.push(k);
      return push(s, { ...snapshot(s), order: [id, ...skipped, ...rest], deferred, phase: 'work', lastDone: null });
    }

    case 'logSet': {
      if (s.phase !== 'work') return s;
      const id = s.order[0];
      const setIndex = s.done[id] ?? 0;
      const planned = byId(plan).get(id)?.sets.length ?? 0;
      const entry: LogEntry = { id: a.id, peId: id, setIndex, at: a.at, extra: setIndex >= planned };
      const done = { ...s.done, [id]: setIndex + 1 };
      const log = [...s.log, entry];
      const base: RunCore = { ...snapshot(s), done, log };

      // Superserie: po sérii prvního cviku rovnou série druhého, pauza až po dvojici.
      const partner = supersetPartner(plan, base, id);
      if (partner) {
        const order = [partner, ...s.order.filter((k) => k !== partner)];
        return push(s, { ...base, order, phase: 'work' });
      }
      // Superserie: dvojice dokončená, vrátit se k prvnímu členu, který má ještě sérii.
      const group = byId(plan).get(id)?.group;
      if (group) {
        const open = plan.exercises
          .filter((e) => e.group === group && s.order.includes(e.id))
          .find((e) => (done[e.id] ?? 0) < setCount(plan, base, e.id));
        if (open) {
          const order = [open.id, ...s.order.filter((k) => k !== open.id)];
          return push(s, { ...base, order, phase: 'rest' });
        }
        const finishedGroup = plan.exercises.filter((e) => e.group === group).map((e) => e.id);
        const order = s.order.filter((k) => !finishedGroup.includes(k));
        const deferred = s.deferred.filter((k) => !finishedGroup.includes(k));
        return push(s, { ...base, order, deferred, phase: order.length ? 'next' : 'finished', lastDone: id });
      }

      if (setIndex + 1 < setCount(plan, base, id)) return push(s, { ...base, phase: 'rest' });
      const order = s.order.slice(1);
      return push(s, {
        ...base,
        order,
        deferred: s.deferred.filter((k) => k !== id),
        phase: order.length ? 'next' : 'finished',
        lastDone: id,
      });
    }

    case 'tap': {
      // Nový design: jedno ťuknutí „Série N hotová“ = (výběr cviku | další série) + zápis série, jeden krok pro Zpět.
      let x = s;
      if (x.phase === 'next') x = reducer(plan, x, { type: 'go', index: a.index });
      else if (x.phase === 'rest') x = reducer(plan, x, { type: 'startSet' });
      if (x.phase !== 'work') return s;
      x = reducer(plan, x, { type: 'logSet', id: a.id, at: a.at });
      return { ...x, history: [...s.history, snapshot(s)].slice(-HISTORY_LIMIT) };
    }

    case 'startSet':
      if (s.phase !== 'rest') return s;
      return push(s, { ...snapshot(s), phase: 'work' });

    case 'extraSet': {
      // Série navíc k právě dokončenému cviku (B15): jen na kartě Na řadě hned po cviku.
      if (s.phase !== 'next' || !s.lastDone) return s;
      const id = s.lastDone;
      return push(s, {
        ...snapshot(s),
        order: [id, ...s.order],
        extra: { ...s.extra, [id]: (s.extra[id] ?? 0) + 1 },
        phase: 'work',
        lastDone: null,
      });
    }

    case 'undo': {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...prev, history: s.history.slice(0, -1) };
    }
  }
}

/**
 * Obnova po zavření appky (B9). Uložený stav se zkontroluje proti aktuálnímu plánu:
 * cviky, které z plánu zmizely, se vyřadí, aby obrazovka nespadla.
 */
export function reviveRunState(plan: WorkoutView, raw: unknown): RunState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<RunState>;
  if (!Array.isArray(s.order) || !s.done || !s.phase) return null;
  const known = new Set(plan.exercises.map((e) => e.id));
  const order = s.order.filter((k) => known.has(k));
  const state: RunState = {
    order,
    deferred: (s.deferred ?? []).filter((k) => known.has(k)),
    done: s.done,
    extra: s.extra ?? {},
    phase: order.length ? s.phase : 'finished',
    lastDone: s.lastDone && known.has(s.lastDone) ? s.lastDone : null,
    log: s.log ?? [],
    history: s.history ?? [],
  };
  return state;
}
