import { describe, expect, it } from 'vitest';
import { initRunState, reducer, type RunAction, type RunState } from './reducer';
import { deriveRun } from './run-view';
import { sampleWorkoutView } from './fixture';

const plan = sampleWorkoutView();
let n = 0;
const tap = (index = 0): RunAction => ({ type: 'tap', index, id: `r-${++n}`, at: '2026-11-09T18:00:00Z' });
const run = (s: RunState, ...a: RunAction[]) => a.reduce((x, y) => reducer(plan, x, y), s);

describe('Obrazovka tréninku: jeden seznam a jedno tlačítko', () => {
  it('na startu: karta prvního cviku s cílem první série a tlačítkem Série 1 hotová', () => {
    const v = deriveRun(plan, initRunState(plan));
    expect(v.toast).toBe('Převlečený? Tak jdeme na to!');
    expect(v.card).toMatchObject({ name: plan.exercises[0].name, setNo: 1, setTotal: 3, cta: 'Série 1 hotová', ctaSub: 'zbývá ještě 2 série', rest: null });
    expect(v.card!.weightLine).toBe('na 35 kg');
    expect(v.card!.hint).toBe('Úvod jede podle plánu. Nachystej si stroj a jdeme.');
    expect(v.nextRows).toHaveLength(6);
    expect(v.nextRows.every((r) => r.pick === null)).toBe(true); // v úvodu nic jiného vybrat nejde
    expect([v.setsDone, v.setsTotal]).toEqual([0, 22]);
  });
  it('po ťuknutí: pauza s pochvalou, tlačítko na další sérii', () => {
    const v = deriveRun(plan, run(initRunState(plan), tap()));
    expect(v.card!.rest).toEqual({ title: 'Série 1 je doma.', line: 'Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál.' });
    expect(v.card).toMatchObject({ setNo: 2, cta: 'Série 2 hotová', ctaSub: 'zbývá ještě 1 série' });
    expect(v.card!.hint).toBe('Ještě tahle a jedna. Jde ti to.');
    expect(v.setsDone).toBe(1);
  });
  it('poslední série cviku a pak hotový řádek a pochvala', () => {
    const s2 = run(initRunState(plan), tap(), tap());
    expect(deriveRun(plan, s2).card!.ctaSub).toBe('poslední série cviku');
    const v = deriveRun(plan, run(s2, tap()));
    expect(v.doneRows.map((r) => r.name)).toEqual([plan.exercises[0].name]);
    expect(v.toast).toBe(`${plan.exercises[0].name} máš v kapse!`);
  });
  it('v hlavní části jdou ostatní cviky vybrat; vybraný je karta, přeskočený v seznamu', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 6; i++) s = run(s, tap()); // úvod: 2 cviky × 3 série
    const v0 = deriveRun(plan, s);
    const pickable = v0.nextRows.filter((r) => r.pick !== null);
    expect(pickable.length).toBeGreaterThan(0);
    const v1 = deriveRun(plan, s, pickable[0].pick!);
    expect(v1.card!.name).toBe(pickable[0].name);
    expect(v1.card!.tag).toBe('Nebo tohle');
    expect(v1.nextRows[0].name).toBe(v0.card!.name);
  });
  it('úplně poslední série má popisek konce tréninku', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 21; i++) s = run(s, tap());
    const v = deriveRun(plan, s);
    expect(v.card).toMatchObject({ isFinal: true, cta: 'Hotovo, trénink je tvůj!' });
  });
});

describe('Výběr jiného cviku ťuknutím', () => {
  it('nápověda v hlavní části mluví o ťuknutí, ne o švihnutí', () => {
    let s = initRunState(plan);
    for (let i = 0; i < 6; i++) s = run(s, tap());
    expect(deriveRun(plan, s).card!.hint).toBe('Obsazeno? Ťukni níž na jiný cvik, k tomuhle se vrátíme.');
  });
});
