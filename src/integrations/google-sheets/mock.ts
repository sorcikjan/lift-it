import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseDelimited } from '@/domain/plan/csv';
import { SheetsError, type SheetsSource } from './types';

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
