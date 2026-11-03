import { describe, expect, it } from 'vitest';
import { candidates, initRunState, reducer, reviveRunState, type RunAction, type RunState } from './reducer';
import { deriveView } from './view';
import { sampleWorkoutView } from './fixture';
import type { WorkoutView } from '../types';

const plan = sampleWorkoutView();
let n = 0;
const log = (): RunAction => ({ type: 'logSet', id: `ls-${++n}`, at: '2026-11-09T18:00:00Z' });
const run = (s: RunState, ...actions: RunAction[]) => actions.reduce((acc, a) => reducer(plan, acc, a), s);
/** Odcvičí celý aktuální cvik od karty Na řadě po další kartu. */
const finishCurrent = (s: RunState, p: WorkoutView = plan) => {
  let x = reducer(p, s, { type: 'go', index: 0 });
  while (x.phase === 'work' || x.phase === 'rest') {
    x = reducer(p, x, x.phase === 'work' ? log() : { type: 'startSet' });
  }
  return x;
};

describe('B2: tři stavy karty', () => {
  it('začíná na kartě Na řadě s prvním cvikem a startovní pochvalou', () => {
    const s = initRunState(plan);
    expect(s.phase).toBe('next');
    expect(s.order[0]).toBe('pe-1');
    const v = deriveView(plan, s);
    expect(v.toast).toBe('Převlečený? Tak jdeme na to!');
    expect(v.header).toBe('Trénink A · cvik 1 ze 7');
    expect(v.cards[0].plan).toBe('3 série · 8× · 35 kg');
  });

  it('B3 → B4: Jdu na to přepne na Cvičím', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 });
    expect(s.phase).toBe('work');
    const v = deriveView(plan, s);
    expect(v.big).toBe('8');
    expect(v.weightLine).toBe('na 35 kg');
    expect(v.cheer).toBe('První série. V klidu a čistě.');
    expect(v.ctaLabel).toBe('Série hotová');
  });

  it('B4 → B5: Série hotová (1 ťuknutí) zaloguje sérii a přepne na Vydýchej se', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 }, { type: 'logSet', id: 'x1', at: 't' });
    expect(s.phase).toBe('rest');
    expect(s.log).toEqual([{ id: 'x1', peId: 'pe-1', setIndex: 0, at: 't', extra: false }]);
    const v = deriveView(plan, s);
    expect(v.restTitle).toBe('Série 1 je doma.');
    expect(v.restLine).toBe('Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál.');
    expect(v.nextSetLabel).toBe('Další série 2 ze 3');
    expect(v.nextSet).toBe('8× na 35 kg');
  });

  it('B5 → B4: Jdu na další sérii vrátí na Cvičím se sérií 2', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 }, log(), { type: 'startSet' });
    expect(s.phase).toBe('work');
    const v = deriveView(plan, s);
    expect(v.setNo).toBe(2);
    expect(v.cheer).toBe('Ještě tahle a jedna. Jde ti to.');
    expect(v.dots).toEqual(['done', 'cur', 'todo']);
  });

  it('texty pauzy se střídají', () => {
    const p = sampleWorkoutView();
    let s = run(initRunState(p), { type: 'go', index: 0 });
    s = finishCurrent(s); s = finishCurrent(s); // úvod hotový, na řadě leg press (4 série)
    s = run(s, { type: 'go', index: 0 }, log());
    expect(deriveView(plan, s).restTitle).toBe('Série 1 je doma.');
    s = run(s, { type: 'startSet' }, log());
    expect(deriveView(plan, s).restTitle).toBe('Dobrá práce.');
    s = run(s, { type: 'startSet' }, log());
    expect(deriveView(plan, s).restTitle).toBe('Pěkně ti to jde.');
  });
});

describe('B6: poslední série cviku', () => {
  it('tlačítko říká Série i cvik hotový a povzbuzení Poslední série', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 }, log(), { type: 'startSet' }, log(), { type: 'startSet' });
    const v = deriveView(plan, s);
    expect(v.ctaLabel).toBe('Série i cvik hotový');
    expect(v.cheer).toBe('Poslední série. Dotáhni to!');
  });

  it('po poslední sérii se pauza nezobrazí: rovnou další karta Na řadě se zelenou pochvalou', () => {
    const s = finishCurrent(initRunState(plan));
    expect(s.phase).toBe('next');
    expect(s.order[0]).toBe('pe-2');
    const v = deriveView(plan, s);
    expect(v.toast).toBe('Tlak na prsa máš v kapse!');
    expect(v.doneCount).toBe(1);
    expect(v.progress.slice(0, 2)).toEqual(['done', 'cur']);
  });
});

describe('Konec tréninku', () => {
  it('poslední série celého tréninku má vlastní text a vede na shrnutí', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 6; i++) s = finishCurrent(s);
    expect(s.order).toEqual(['pe-7']);
    s = run(s, { type: 'go', index: 0 }, log(), { type: 'startSet' }, log(), { type: 'startSet' });
    const v = deriveView(plan, s);
    expect(v.isFinal).toBe(true);
    expect(v.ctaLabel).toBe('Hotovo, trénink je tvůj!');
    expect(v.cheer).toBe('Poslední série celého tréninku. Dej do toho všechno!');
    expect(v.big).toBe('30');
    expect(v.bigUnit).toBe('s');
    expect(v.weightLine).toBe('výdrž');
    s = run(s, log());
    expect(s.phase).toBe('finished');
    expect(s.log).toHaveLength(3 + 3 + 4 + 3 + 3 + 3 + 3);
  });

  it('karta závěru má hint pro závěr a plank plán v sekundách', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 6; i++) s = finishCurrent(s);
    const v = deriveView(plan, s);
    expect(v.cards).toHaveLength(1);
    expect(v.cards[0].hint).toBe('Závěr, už jen kousek. Ty to dáš.');
    expect(v.cards[0].plan).toBe('3 série · 30 s');
    expect(v.thenText).toBe('Poslední cvik tréninku');
  });
});

describe('B7: obsazený stroj', () => {
  const inMain = () => finishCurrent(finishCurrent(initRunState(plan)));

  it('v úvodu švihnout nejde: jen jedna karta a go(1) nic neudělá', () => {
    const s = initRunState(plan);
    expect(candidates(plan, s)).toEqual(['pe-1']);
    expect(deriveView(plan, s).cards[0].hint).toBe('Úvod jede podle plánu. Nachystej si stroj a jdeme.');
    expect(reducer(plan, s, { type: 'go', index: 1 })).toBe(s);
  });

  it('v závěru švihnout nejde', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 6; i++) s = finishCurrent(s);
    expect(candidates(plan, s)).toEqual(['pe-7']);
    expect(reducer(plan, s, { type: 'go', index: 1 })).toBe(s);
  });

  it('v hlavní části nabídne ostatní cviky hlavní části, ne závěr', () => {
    const s = inMain();
    expect(candidates(plan, s)).toEqual(['pe-3', 'pe-4', 'pe-5', 'pe-6']);
    const v = deriveView(plan, s);
    expect(v.cards.map((c) => c.tag)).toEqual(['Na řadě', 'Nebo tohle', 'Nebo tohle', 'Nebo tohle']);
    expect(v.cards[0].hint).toBe('Obsazeno? Švihni kartu doleva, k tomuhle se vrátíme.');
    expect(v.cards[1].hint).toBe('Leg press počká, vrátíme se k němu hned potom.');
    expect(v.thenText).toBe('Ve frontě ještě 4 cviky');
  });

  it('přeskočený cvik se zařadí hned za zvolený, ne na konec', () => {
    const s = run(inMain(), { type: 'go', index: 1 });
    expect(s.order).toEqual(['pe-4', 'pe-3', 'pe-5', 'pe-6', 'pe-7']);
    expect(s.deferred).toEqual(['pe-3']);
    expect(deriveView(plan, s).thenText).toBe('Pak: Leg press (vracíme se)');
  });

  it('po zvoleném cviku se vrací k přeskočenému se štítkem Vracíme se', () => {
    let s = run(inMain(), { type: 'go', index: 1 });
    while (s.phase !== 'next') s = run(s, s.phase === 'work' ? log() : { type: 'startSet' });
    expect(s.order[0]).toBe('pe-3');
    const v = deriveView(plan, s);
    expect(v.cards[0].tag).toBe('Vracíme se');
    expect(v.toast).toBe('Veslování na kladce máš v kapse!');
  });

  it('přeskočení více cviků najednou je zachová v pořadí plánu', () => {
    const s = run(inMain(), { type: 'go', index: 2 });
    expect(s.order).toEqual(['pe-5', 'pe-3', 'pe-4', 'pe-6', 'pe-7']);
    expect(s.deferred).toEqual(['pe-3', 'pe-4']);
  });

  it('karta Na řadě: go mimo rozsah nic nerozbije', () => {
    const s = inMain();
    expect(reducer(plan, s, { type: 'go', index: 9 })).toBe(s);
    expect(reducer(plan, s, { type: 'go', index: -1 })).toBe(s);
  });
});

describe('Neplatné akce', () => {
  it('logSet mimo Cvičím nic nezapíše', () => {
    const s = initRunState(plan);
    expect(reducer(plan, s, log())).toBe(s);
    const rest = run(s, { type: 'go', index: 0 }, log());
    expect(reducer(plan, rest, log())).toBe(rest);
  });
  it('startSet mimo pauzu nic neudělá', () => {
    const s = initRunState(plan);
    expect(reducer(plan, s, { type: 'startSet' })).toBe(s);
  });
});

describe('Zpět místo dialogů', () => {
  it('Zpět vrátí omylem zalogovanou sérii', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 }, { type: 'logSet', id: 'omyl', at: 't' });
    const back = run(s, { type: 'undo' });
    expect(back.phase).toBe('work');
    expect(back.log).toEqual([]);
    expect(back.done['pe-1'] ?? 0).toBe(0);
  });
  it('Zpět na začátku nic neudělá', () => {
    const s = initRunState(plan);
    expect(run(s, { type: 'undo' })).toBe(s);
  });
});

describe('B9: obnova po zavření appky', () => {
  it('stav přežije uložení jako JSON a ukáže stejnou kartu ve stejném stavu', () => {
    const s = run(initRunState(plan), { type: 'go', index: 0 }, log(), { type: 'startSet' }, log());
    const stored = JSON.parse(JSON.stringify(s));
    const revived = reviveRunState(plan, stored)!;
    expect(revived).toEqual(s);
    expect(deriveView(plan, revived)).toEqual(deriveView(plan, s));
    expect(revived.phase).toBe('rest');
  });
  it('rozbitý nebo cizí uložený stav se zahodí', () => {
    expect(reviveRunState(plan, null)).toBeNull();
    expect(reviveRunState(plan, { foo: 1 })).toBeNull();
  });
  it('cvik, který z plánu zmizel, se při obnově vyřadí', () => {
    const s = initRunState(plan);
    const smaller: WorkoutView = { ...plan, exercises: plan.exercises.filter((e) => e.id !== 'pe-1') };
    expect(reviveRunState(smaller, s)!.order[0]).toBe('pe-2');
  });
});

describe('B11: typy cviků', () => {
  it('cvik jen na opakování ukáže vlastní váhu', () => {
    const p: WorkoutView = {
      ...plan,
      exercises: [{ ...plan.exercises[0], type: 'reps', sets: plan.exercises[0].sets.map((x) => ({ ...x, weightKg: null })) }],
    };
    const v = deriveView(p, reducer(p, initRunState(p), { type: 'go', index: 0 }));
    expect(v.weightLine).toBe('vlastní váha');
    expect(v.big).toBe('8');
  });
  it('rozsah opakování a stoupající váha', () => {
    const base = plan.exercises[2];
    const e = { ...base, sets: base.sets.map((x, i) => ({ ...x, repsMin: 8, repsMax: 10, weightKg: 40 + i * 5 })) };
    const p: WorkoutView = { ...plan, exercises: [e] };
    const v = deriveView(p, initRunState(p));
    expect(v.cards[0].plan).toBe('4 série · 8–10× · 40–55 kg');
    const w = deriveView(p, reducer(p, initRunState(p), { type: 'go', index: 0 }));
    expect(w.big).toBe('8–10');
    expect(w.weightLine).toBe('na 40 kg');
  });
  it('desetinná čárka ve váze', () => {
    const base = plan.exercises[0];
    const e = { ...base, sets: base.sets.map((x) => ({ ...x, weightKg: 37.5 })) };
    const p: WorkoutView = { ...plan, exercises: [e] };
    expect(deriveView(p, initRunState(p)).cards[0].plan).toBe('3 série · 8× · 37,5 kg');
  });
});

describe('B15: série navíc', () => {
  it('hned po dokončeném cviku jde přidat sérii navíc a zaloguje se jako extra', () => {
    let s = finishCurrent(initRunState(plan));
    expect(deriveView(plan, s).canExtraSet).toBe('Tlak na prsa');
    s = run(s, { type: 'extraSet' });
    expect(s.phase).toBe('work');
    expect(s.order[0]).toBe('pe-1');
    expect(deriveView(plan, s).setNo).toBe(4);
    s = run(s, { type: 'logSet', id: 'navic', at: 't' });
    expect(s.log.at(-1)).toMatchObject({ id: 'navic', peId: 'pe-1', setIndex: 3, extra: true });
    expect(s.phase).toBe('next');
    expect(s.order[0]).toBe('pe-2');
  });
});

describe('B14: superserie', () => {
  const p: WorkoutView = {
    ...plan,
    exercises: plan.exercises.map((e) => (e.id === 'pe-3' || e.id === 'pe-4' ? { ...e, group: 'A', sets: e.sets.slice(0, 3) } : e)),
  };
  const toMain = () => {
    let s = initRunState(p);
    s = finishCurrent(s, p);
    return finishCurrent(s, p);
  };
  it('po sérii A1 jde rovnou A2 bez pauzy, pauza až po dvojici', () => {
    let s = reducer(p, toMain(), { type: 'go', index: 0 });
    expect(s.order[0]).toBe('pe-3');
    s = reducer(p, s, log());
    expect(s.phase).toBe('work');
    expect(s.order[0]).toBe('pe-4');
    s = reducer(p, s, log());
    expect(s.phase).toBe('rest');
    expect(s.order[0]).toBe('pe-3');
    expect(s.done).toMatchObject({ 'pe-3': 1, 'pe-4': 1 });
  });
  it('po poslední dvojici jde další karta Na řadě', () => {
    let s = reducer(p, toMain(), { type: 'go', index: 0 });
    for (let i = 0; i < 6; i++) s = reducer(p, s, s.phase === 'rest' ? { type: 'startSet' } : log());
    while (s.phase === 'rest' || s.phase === 'work') s = reducer(p, s, s.phase === 'rest' ? { type: 'startSet' } : log());
    expect(s.phase).toBe('next');
    expect(s.order).toEqual(['pe-5', 'pe-6', 'pe-7']);
    expect(s.done).toMatchObject({ 'pe-3': 3, 'pe-4': 3 });
  });
});
