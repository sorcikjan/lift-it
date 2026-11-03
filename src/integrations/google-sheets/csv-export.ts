import { parseDelimited } from '@/domain/plan/csv';
import { SheetsError, type SheetTab, type SheetsSource } from './types';

/** Záloha bez OAuth: …/export?format=csv&gid=… (jen pro sheet sdílený „kdokoli s odkazem“). */
export function csvExportSource(fetchImpl: typeof fetch = fetch, knownGid: number | null = null): SheetsSource {
  return {
    async listTabs() {
      return [{ title: 'List', gid: knownGid ?? 0 }];
    },
    async readTab(id, tab: SheetTab) {
      const res = await fetchImpl(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${tab.gid}`, { redirect: 'follow' });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || type.includes('text/html')) throw new SheetsError('google_login');
      return parseDelimited(await res.text(), ',');
    },
  };
}
