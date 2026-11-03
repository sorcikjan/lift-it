import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDelimited } from './csv';
import { guessMapping } from './parse-sheet';
import { colLetter, writebackCells, writebackColumn } from './writeback';
import { setsText } from '../sets-text';

const rows = parseDelimited(readFileSync('tests/fixtures/sheets/tyden-hlavicka.csv', 'utf8'));
const mapping = guessMapping(rows);

describe('A9: zápis do sheetu', () => {
  it('zápis sérií: stejné krátce, různé jednotlivě', () => {
    expect(setsText([{ reps: 10, weight_kg: 40, time_s: null }, { reps: 10, weight_kg: '40.00', time_s: null }])).toBe('2 × 10, 40 kg');
    expect(setsText([{ reps: 10, weight_kg: 40, time_s: null }, { reps: 8, weight_kg: 42.5, time_s: null }])).toBe('40 kg × 10, 42,5 kg × 8');
    expect(setsText([{ reps: 12, weight_kg: null, time_s: null }])).toBe('1 × 12');
    expect(setsText([{ reps: null, weight_kg: null, time_s: 30 }, { reps: null, weight_kg: null, time_s: 30 }])).toBe('2 × 30 s');
  });

  it('sloupec za daty, nebo existující „Odcvičeno“', () => {
    expect(writebackColumn(rows, mapping, 'Odcvičeno')).toBe(7);
    const withCol = rows.map((r, i) => (i === 0 ? [...r, 'Odcvičeno'] : r));
    expect(writebackColumn(withCol, mapping, 'Odcvičeno')).toBe(7);
  });

  it('zapíše hlavičku a řádek každého odcvičeného cviku, nic jiného', () => {
    const cells = writebackCells(rows, mapping, [
      { workoutLabel: 'A', position: 2, sourceName: 'Leg press', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight_kg: 45, time_s: null })) },
      { workoutLabel: 'A', position: 0, sourceName: 'Tlak na prsa', sets: [] },
    ], 'Odcvičeno');
    const leg = rows.findIndex((r) => r[1] === 'Leg press' && r[0] === 'A');
    expect(cells).toEqual([{ row: 0, col: 7, value: 'Odcvičeno' }, { row: leg, col: 7, value: '4 × 10, 45 kg' }]);
  });

  it('když se pořadí změnilo, najde cvik podle názvu; neznámý přeskočí', () => {
    const cells = writebackCells(rows, mapping, [
      { workoutLabel: 'A', position: 0, sourceName: 'leg press', sets: [{ reps: 10, weight_kg: 40, time_s: null }] },
      { workoutLabel: 'A', position: 1, sourceName: 'Neexistuje', sets: [{ reps: 10, weight_kg: 40, time_s: null }] },
    ], 'Odcvičeno');
    expect(cells).toHaveLength(2);
    expect(rows[cells[1].row][1]).toBe('Leg press');
  });

  it('A1 notace', () => {
    expect(colLetter(0)).toBe('A');
    expect(colLetter(7)).toBe('H');
    expect(colLetter(26)).toBe('AA');
  });
});
