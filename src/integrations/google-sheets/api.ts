import { SheetsError, type SheetTab, type SheetsSource } from './types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Google Sheets API v4 pod účtem uživatele (scope jen pro čtení). Token nikdy neodchází do prohlížeče. */
export function googleSheetsApi(accessToken: string, fetchImpl: typeof fetch = fetch): SheetsSource {
  const get = async (url: string) => {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 401) throw new SheetsError('google_login');
    if (res.status === 403) throw new SheetsError('forbidden');
    if (res.status === 404) throw new SheetsError('not_found');
    if (!res.ok) throw new SheetsError('unavailable', `HTTP ${res.status}`);
    return res.json();
  };
  return {
    async listTabs(id) {
      const data = await get(`${BASE}/${id}?fields=sheets.properties(sheetId,title)`);
      return (data.sheets ?? []).map((s: { properties: { title: string; sheetId: number } }) => ({ title: s.properties.title, gid: s.properties.sheetId }));
    },
    async readTab(id, tab: SheetTab) {
      const range = encodeURIComponent(`'${tab.title.replace(/'/g, "''")}'`);
      const data = await get(`${BASE}/${id}/values/${range}?valueRenderOption=FORMATTED_VALUE`);
      return (data.values ?? []).map((r: unknown[]) => r.map((c) => String(c ?? '')));
    },
  };
}
