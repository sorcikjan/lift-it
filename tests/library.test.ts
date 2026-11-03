import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMatchIndex, matchExercise } from '@/domain/plan/match';
import sample from '../fixtures/ukazkovy-trenink-a.json';

const lib = JSON.parse(readFileSync('public/library/exercises.json', 'utf8'));
const cs = JSON.parse(readFileSync('seed/cs-exercises.json', 'utf8'));
const byId = new Map(lib.exercises.map((e: { id: string }) => [e.id, e]));

describe('C1–C3: knihovna', () => {
  it('základ z free-exercise-db (veřejná doména)', () => {
    expect(lib.exercises.length).toBeGreaterThan(850);
    expect(lib.exercises.every((e: { license: string }) => e.license.startsWith('Public domain'))).toBe(true);
  });
  it('česká vrstva: ~100 cviků, každý má název, aliasy a 3–5 kroků techniky', () => {
    expect(cs.cviky.length).toBeGreaterThanOrEqual(100);
    for (const c of cs.cviky) {
      expect(c.name_cs, c.id).toBeTruthy();
      expect(c.aliases.length, c.id).toBeGreaterThan(0);
      expect(c.steps_cs.length, c.id).toBeGreaterThanOrEqual(3);
      expect(c.steps_cs.length, c.id).toBeLessThanOrEqual(5);
    }
  });
  it('kroky techniky: sentence case, bez emoji a bez VELKÝCH PÍSMEN', () => {
    for (const c of cs.cviky) for (const s of c.steps_cs) {
      expect(s, c.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(s, c.id).not.toMatch(/\b[A-ZÁ-Ž]{4,}\b/);
    }
  });
  it('každý cvik z prvního týdne má obrázek a české kroky techniky', () => {
    const index = buildMatchIndex(lib);
    for (const c of sample.cviky) {
      const id = matchExercise(index, c.nazev).exerciseId!;
      const e = byId.get(id) as { images: string[]; steps_cs: string[] };
      expect(e.images.length, c.nazev).toBeGreaterThanOrEqual(2);
      expect(e.steps_cs.length, c.nazev).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Texty (feel-good) doslova z PRD', () => {
  const t = JSON.parse(readFileSync('src/i18n/cs.json', 'utf8')).texty;
  it.each([
    ['start', 'Převlečený? Tak jdeme na to!'],
    ['naRade', 'Nachystej si stroj a jdeme.'],
    ['naRadeSvihni', 'Obsazeno? Švihni kartu doleva, k tomuhle se vrátíme.'],
    ['prvniSerie', 'První série. V klidu a čistě.'],
    ['uprostred', 'Drž tempo, jedeš.'],
    ['predposledni', 'Ještě tahle a jedna. Jde ti to.'],
    ['posledniSerie', 'Poslední série. Dotáhni to!'],
    ['posledniSerieTreninku', 'Poslední série celého tréninku. Dej do toho všechno!'],
    ['pauza1', 'Série {n} je doma.'],
    ['pauza2', 'Dobrá práce.'],
    ['pauza3', 'Pěkně ti to jde.'],
    ['pauzaText', 'Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál.'],
    ['cvikHotovy', '{name} máš v kapse!'],
    ['konec', 'Hotovo, trénink je tvůj!'],
  ])('%s', (k, v) => expect(t[k]).toBe(v));
});
