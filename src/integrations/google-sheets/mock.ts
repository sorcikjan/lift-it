import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseDelimited } from '@/domain/plan/csv';
import { SheetsError, type CellWrite, type SheetsSource, type SheetsWriter } from './types';

/**
 * Mock pro vývoj a e2e: spreadsheetId „mock-<soubor>“ čte tests/fixtures/sheets/<soubor>.csv,
 * listy = soubory se stejnou předponou. Obsah jde v testech přepsat přes setMockSheet.
 */
const overrides = new Map<string, string>();
export function setMockSheet(key: string, csv: string) { overrides.set(key, csv); }

export function mockSheets(): SheetsSource {
  const dir = path.join(process.cwd(), 'tests', 'fixtures', 'sheets');
  return {
    async listTabs(id) {
      if (!id.startsWith('mock-')) throw new SheetsError('not_found');
      const prefix = id.slice(5);
      const files = (await readdir(dir)).filter((f) => f.startsWith(prefix) && /\.(csv|tsv)$/.test(f)).sort();
      if (!files.length && !overrides.has(prefix)) throw new SheetsError('not_found');
      const names = files.length ? files : [prefix + '.csv'];
      return names.map((f, i) => ({ title: f.replace(/\.(csv|tsv)$/, ''), gid: i }));
    },
    async readTab(id, tab) {
      const o = overrides.get(tab.title) ?? overrides.get(id.slice(5));
      if (o) return parseDelimited(o);
      const files = await readdir(dir);
      const f = files.find((x) => x.replace(/\.(csv|tsv)$/, '') === tab.title);
      if (!f) throw new SheetsError('not_found');
      return parseDelimited(await readFile(path.join(dir, f), 'utf8'));
    },
  };
}

/** Zápisy do mock sheetu (A9), aby je e2e test mohl zkontrolovat. „mock-readonly-…“ simuluje sheet bez práva úprav. */
export const mockWrites = new Map<string, CellWrite[]>();
export function mockWriter(): SheetsWriter {
  return {
    async writeCells(id, tab, cells) {
      if (!id.startsWith('mock-')) throw new SheetsError('not_found');
      if (id.startsWith('mock-readonly')) throw new SheetsError('read_only');
      mockWrites.set(tab.title, [...(mockWrites.get(tab.title) ?? []), ...cells]);
    },
  };
}
