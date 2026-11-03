import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDelimited } from './csv';
import { guessMapping, parseReps, parseSetsReps, parseSheet, parseWeight, parseRest, splitGroup } from './parse-sheet';
import { buildMatchIndex, matchExercise } from './match';

const fx = (f: string) => readFileSync(path.join(__dirname, '../../../tests/fixtures/sheets', f), 'utf8');
const lib = JSON.parse(readFileSync(path.join(__dirname, '../../../public/library/exercises.json'), 'utf8'));
const index = buildMatchIndex(lib);

describe('A7: zápisy buněk', () => {
  it.each([
    ['3x10', 3, 10, 10],
    ['3×10', 3, 10, 10],
    ['4 × 8–10', 4, 8, 10],
    ['4x8-10', 4, 8, 10],
  ])('série × opakování „%s“', (raw, sets, min, max) => {
    expect(parseSetsReps(raw)).toEqual({ sets, set: expect.objectContaining({ repsMin: min, repsMax: max }) });
  });
  it('3x30 s je čas', () => expect(parseSetsReps('3x30 s')?.set.timeS).toBe(30));
  it('1x5 min je čas v sekundách', () => expect(parseSetsReps('1x5 min')?.set.timeS).toBe(300));
  it('10/10/8 dá tři série', () => {
    const r = parseReps('10/10/8')!;
    expect(r.perSet).toBe(true);
    expect(r.reps!.map((x) => x.repsMax)).toEqual([10, 10, 8]);
  });
  it('max = do selhání', () => expect(parseReps('max')!.reps![0].toFailure).toBe(true));
  it.each([
    ['40', [40]], ['40 kg', [40]], ['22,5', [22.5]], ['40/45/50', [40, 45, 50]], ['37.5kg', [37.5]],
  ])('váha „%s“', (raw, w) => expect(parseWeight(raw)!.weights).toEqual(w));
  it('BW a prázdné = vlastní váha', () => {
    expect(parseWeight('BW')!.bodyweight).toBe(true);
    expect(parseWeight('')!.bodyweight).toBe(true);
  });
  it('nečitelná váha se nezahodí', () => expect(parseWeight('dvacet')).toBeUndefined());
  it('váhy se zaokrouhlí na 0,25 kg', () => expect(parseWeight('22,6')!.weights).toEqual([22.5]));
  it.each([['90', 90], ['90 s', 90], ['1:30', 90], ['2 min', 120], ['', null]])('pauza „%s“', (raw, s) =>
    expect(parseRest(raw)).toBe(s));
  it('superserie A1/A2', () => {
    expect(splitGroup('A1 Leg press')).toEqual({ group: 'A', name: 'Leg press' });
    expect(splitGroup('B2. Zakopávání')).toEqual({ group: 'B', name: 'Zakopávání' });
    expect(splitGroup('Leg press')).toEqual({ group: null, name: 'Leg press' });
  });
});

describe('A7: celý týden s hlavičkou a sloupcem Trénink', () => {
  const rows = parseDelimited(fx('tyden-hlavicka.csv'));
  const mapping = guessMapping(rows);
  const draft = parseSheet(rows, mapping);

  it('pozná hlavičku', () => {
    expect(mapping.headerRow).toBe(0);
    expect(Object.values(mapping.columns)).toEqual(['workout', 'exercise', 'sets', 'reps', 'weight', 'rest', 'note']);
  });
  it('dva tréninky A a B', () => {
    expect(draft.workouts.map((w) => w.label)).toEqual(['A', 'B']);
    expect(draft.workouts[0].exercises).toHaveLength(7);
    expect(draft.workouts[1].exercises).toHaveLength(4);
  });
  it('správné série, opakování a váhy', () => {
    const leg = draft.workouts[0].exercises[2];
    expect(leg.sourceName).toBe('Leg press');
    expect(leg.sets).toHaveLength(4);
    expect(leg.sets[0]).toEqual({ repsMin: 10, repsMax: 10, weightKg: 40, timeS: null, toFailure: false });
    expect(leg.restS).toBe(120);
    expect(leg.note).toBe('kolena ven');
    const plank = draft.workouts[0].exercises[6];
    expect(plank.sets[0].timeS).toBe(30);
    expect(plank.bodyweight).toBe(true);
  });
  it('rozsah, desetinná čárka, stoupající váha, max a 3x10 ve sloupci série', () => {
    const [drep, rdl, kliky, bench] = draft.workouts[1].exercises;
    expect(drep.sets[0]).toMatchObject({ repsMin: 8, repsMax: 10, weightKg: 22.5 });
    expect(rdl.sets.map((s) => s.weightKg)).toEqual([40, 45, 50]);
    expect(kliky.sets[0].toFailure).toBe(true);
    expect(bench.sets).toHaveLength(3);
    expect(bench.sets[0]).toMatchObject({ repsMax: 10, weightKg: 35 });
  });
  it('bez označení bloků: první úvod, poslední závěr, zbytek hlavní část', () => {
    expect(draft.workouts[0].exercises.map((e) => e.blok)).toEqual(['uvod', 'hlavni', 'hlavni', 'hlavni', 'hlavni', 'hlavni', 'zaver']);
  });
  it('žádné nejasné buňky', () => expect(draft.issueCount).toBe(0));
});

describe('A7: nadpisy tréninků a bloků v listu', () => {
  const rows = parseDelimited(fx('tyden-bloky.csv'));
  const draft = parseSheet(rows, guessMapping(rows));

  it('najde oba tréninky podle nadpisu', () => {
    expect(draft.workouts.map((w) => [w.label, w.exercises.length])).toEqual([['A', 8], ['B', 4]]);
  });
  it('bloky podle nadpisů Úvod / Hlavní část / Závěr', () => {
    expect(draft.workouts[0].exercises.map((e) => e.blok)).toEqual(['uvod', 'uvod', 'hlavni', 'hlavni', 'hlavni', 'hlavni', 'zaver', 'zaver']);
  });
  it('superserie A1/A2', () => {
    const [, , a1, a2] = draft.workouts[0].exercises;
    expect([a1.group, a1.sourceName, a2.group, a2.sourceName]).toEqual(['A', 'Leg press', 'A', 'Zakopávání']);
    expect(a2.sets).toHaveLength(4);
  });
  it('rotoped 1x5 min = 300 s', () => expect(draft.workouts[0].exercises[0].sets[0].timeS).toBe(300));
});

describe('A4: nejasné buňky se zvýrazní, nezahodí', () => {
  const rows = parseDelimited(fx('tyden-bez-hlavicky.tsv'));
  const mapping = guessMapping(rows);
  const draft = parseSheet(rows, mapping);
  it('bez hlavičky odhadne sloupce podle obsahu', () => {
    expect(mapping.headerRow).toBeNull();
    expect(Object.values(mapping.columns)).toEqual(['exercise', 'sets', 'reps', 'weight']);
  });
  it('„dvacet“ skončí v issues a cvik zůstane', () => {
    expect(draft.workouts[0].exercises).toHaveLength(6);
    const zak = draft.workouts[0].exercises[4];
    expect(zak.issues).toEqual([{ field: 'weight', raw: 'dvacet' }]);
    expect(zak.sets).toHaveLength(3);
    expect(draft.issueCount).toBe(1);
  });
});

describe('A3: párování názvů na knihovnu', () => {
  it.each([
    ['Tlak na prsa', 'Machine_Bench_Press'],
    ['Přítahy horní kladky', 'Wide-Grip_Lat_Pulldown'],
    ['Leg press', 'Leg_Press'],
    ['Veslování na kladce', 'Seated_Cable_Rows'],
    ['Tlaky na ramena s jednoručkami', 'Dumbbell_Shoulder_Press'],
    ['Zakopávání', 'Lying_Leg_Curls'],
    ['Plank', 'Plank'],
    ['bench', 'Barbell_Bench_Press_-_Medium_Grip'],
    ['BENCH PRESS', 'Barbell_Bench_Press_-_Medium_Grip'],
    ['veslovani na kladce', 'Seated_Cable_Rows'],
    ['Hip thrust', 'Barbell_Hip_Thrust'],
  ])('„%s“ → %s', (raw, id) => {
    const m = matchExercise(index, raw);
    expect(m.exerciseId).toBe(id);
    expect(['exact', 'alias']).toContain(m.kind);
  });
  it('překlep dá fuzzy návrh, ne jistou shodu', () => {
    const m = matchExercise(index, 'Legpres');
    expect(m.kind).toBe('fuzzy');
    expect(m.exerciseId).toBeNull();
    expect(m.suggestions[0].exerciseId).toBe('Leg_Press');
  });
  it('„Brišáky“ navrhne sklapovačky', () => {
    const m = matchExercise(index, 'Brišáky');
    expect(m.exerciseId ?? m.suggestions[0]?.exerciseId).toBe('Crunches');
  });
  it('vlastní alias má přednost a uloží se jedním potvrzením', () => {
    const own = buildMatchIndex({ ...lib, aliases: [...lib.aliases, { text: 'legpres', exercise_id: 'Leg_Press', owner_id: 'me' }] });
    expect(matchExercise(own, 'Legpres')).toMatchObject({ kind: 'alias', exerciseId: 'Leg_Press' });
  });
  it('nesmysl nic nespáruje', () => expect(matchExercise(index, 'xyzzy qwrt').kind).toBe('none'));
});

describe('Skutečné sheety od trenéra (fixtures/*.csv)', () => {
  const dir = path.join(__dirname, '../../../fixtures');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.csv')) : [];
  it.skipIf(!files.length)('každý skutečný týden dá aspoň jeden trénink se cviky', () => {
    for (const f of files) {
      const rows = parseDelimited(readFileSync(path.join(dir, f), 'utf8'));
      const draft = parseSheet(rows, guessMapping(rows));
      expect(draft.workouts.length, f).toBeGreaterThan(0);
      expect(draft.workouts.every((w) => w.exercises.length > 0), f).toBe(true);
    }
  });
});
