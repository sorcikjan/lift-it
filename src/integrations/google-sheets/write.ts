import { colLetter } from '@/domain/plan/writeback';
import { SheetsError, type CellWrite, type SheetTab, type SheetsWriter } from './types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Zápis přes Sheets API v4 (values:batchUpdate). 403 = chybí právo úprav nebo scope pro zápis. */
export function googleSheetsWriter(accessToken: string, fetchImpl: typeof fetch = fetch): SheetsWriter {
  return {
    async writeCells(id: string, tab: SheetTab, cells: CellWrite[]) {
      if (!cells.length) return;
      const sheet = `'${tab.title.replace(/'/g, "''")}'`;
      const res = await fetchImpl(`${BASE}/${id}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: cells.map((c) => ({ range: `${sheet}!${colLetter(c.col)}${c.row + 1}`, values: [[c.value]] })),
        }),
      });
      if (res.status === 401) throw new SheetsError('google_login');
      if (res.status === 403) throw new SheetsError('read_only');
      if (res.status === 404) throw new SheetsError('not_found');
      if (!res.ok) throw new SheetsError('unavailable', `HTTP ${res.status}`);
    },
  };
}
