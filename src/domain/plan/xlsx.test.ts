import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { colIndex, readXlsx, XlsxError } from './xlsx';
import { filesToRows } from './xlsx-import';
import { guessMapping, parseSheet } from './parse-sheet';

const file = readFileSync(path.join(__dirname, '../../../fixtures/trenink-2.xlsx'));

describe('XLSX od trenéra', () => {
  it('přečte list s cviky, sloučené buňky dají hodnotu do první buňky', async () => {
    const [sheet] = await readXlsx(file);
    expect(sheet.name).toBe('List1');
    expect(sheet.rows[3].slice(2, 7)).toEqual(['A1 ', 'Seated Thoracic Rotation with Medicine Ball', '', '', '2x8']);
    expect(sheet.rows[5].slice(2, 8)).toEqual(['Lat pulldown - menší nástavec', '', '', '', '3x9-10', '32,5 kg']);
    expect(sheet.rows[7][8]).toContain('35 kg');
  });

  it('nezná soubor → srozumitelná chyba', async () => {
    await expect(readXlsx(new TextEncoder().encode('ahoj'))).rejects.toBeInstanceOf(XlsxError);
  });

  it('A1 notace sloupců', () => {
    expect(colIndex('A4')).toBe(0);
    expect(colIndex('H11')).toBe(7);
    expect(colIndex('AA1')).toBe(26);
  });

  it('parser z něj udělá celý trénink: 9 cviků, superserie, čas a poznámka', async () => {
    const rows = await filesToRows([{ name: '1-Trénink 2.xlsx', data: file }]);
    const draft = parseSheet(rows, guessMapping(rows));
    expect(draft.workouts).toHaveLength(1);
    const [w] = draft.workouts;
    expect(w.title).toContain('1-Trénink 2');
    expect(w.exercises.map((e) => e.sourceName)).toEqual([
      'Seated Thoracic Rotation with Medicine Ball', 'Lying Medicine Ball Pullover', 'Lat pulldown - menší nástavec',
      'Shoulder press DB', 'Leg press', 'Zakopávání na stroji', 'Dumbbell Y Raise on Incline Bench',
      'Seated cable row - V adapter', 'Plank',
    ]);
    const by = (n: string) => w.exercises.find((e) => e.sourceName === n)!;
    expect(by('Seated Thoracic Rotation with Medicine Ball').group).toBe('A');
    expect(by('Lying Medicine Ball Pullover').group).toBe('A');
    // Superserie zůstane v jednom bloku
    expect(by('Lying Medicine Ball Pullover').blok).toBe(by('Seated Thoracic Rotation with Medicine Ball').blok);
    expect(by('Lat pulldown - menší nástavec').sets).toHaveLength(3);
    expect(by('Lat pulldown - menší nástavec').sets[0]).toMatchObject({ repsMin: 9, repsMax: 10, weightKg: 32.5 });
    expect(by('Leg press').sets[0].weightKg).toBe(70);
    expect(by('Leg press').note).toContain('35 kg');
    expect(by('Plank').sets).toHaveLength(2);
    expect(by('Plank').sets[0].timeS).toBe(60);
    expect(draft.issueCount).toBe(0);
  });

  it('dva soubory = dva tréninky', async () => {
    const rows = await filesToRows([{ name: 'Trénink 1.xlsx', data: file }, { name: 'Trénink 2.xlsx', data: file }]);
    const draft = parseSheet(rows, guessMapping(rows));
    expect(draft.workouts.map((w) => w.label)).toEqual(['A', 'B']);
    expect(draft.workouts.every((w) => w.exercises.length === 9)).toBe(true);
  });
});
