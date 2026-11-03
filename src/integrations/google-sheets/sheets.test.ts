import { describe, expect, it, vi } from 'vitest';
import { parseSheetUrl } from './url';
import { googleSheetsApi } from './api';
import { csvExportSource } from './csv-export';
import { mockSheets } from './mock';
import { SheetsError } from './types';
import { decrypt, encrypt } from '@/server/crypto';

describe('A1: odkaz na sheet', () => {
  it('vytáhne id a gid', () => {
    expect(parseSheetUrl('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=12345'))
      .toEqual({ spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', gid: 12345 });
    expect(parseSheetUrl('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit?usp=sharing').gid).toBeNull();
  });
  it('nesmysl odmítne', () => expect(() => parseSheetUrl('https://example.com')).toThrow(SheetsError));
});

describe('Google Sheets API v4', () => {
  it('čte listy a buňky s tokenem uživatele', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('fields=')) return new Response(JSON.stringify({ sheets: [{ properties: { title: 'Týden 46', sheetId: 7 } }] }));
      return new Response(JSON.stringify({ values: [['Cvik', 'Série'], ['Leg press', 4]] }));
    });
    const api = googleSheetsApi('tok', fetchMock as unknown as typeof fetch);
    const tabs = await api.listTabs('abc');
    expect(tabs).toEqual([{ title: 'Týden 46', gid: 7 }]);
    expect(await api.readTab('abc', tabs[0])).toEqual([['Cvik', 'Série'], ['Leg press', '4']]);
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({ Authorization: 'Bearer tok' });
  });
  it('vypršený token = požádat o přihlášení', async () => {
    const api = googleSheetsApi('x', (async () => new Response('', { status: 401 })) as unknown as typeof fetch);
    await expect(api.listTabs('abc')).rejects.toMatchObject({ code: 'google_login' });
  });
});

describe('Záloha: CSV export veřejného sheetu', () => {
  it('přečte CSV', async () => {
    const src = csvExportSource((async () => new Response('Cvik,Série\nLeg press,4', { headers: { 'content-type': 'text/csv' } })) as unknown as typeof fetch, 5);
    const [tab] = await src.listTabs('abc');
    expect(tab.gid).toBe(5);
    expect(await src.readTab('abc', tab)).toEqual([['Cvik', 'Série'], ['Leg press', '4']]);
  });
  it('neveřejný sheet (přesměrování na přihlášení) = google_login', async () => {
    const src = csvExportSource((async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch);
    await expect(src.readTab('abc', { title: 'x', gid: 0 })).rejects.toMatchObject({ code: 'google_login' });
  });
});

describe('Mock nad fixturami', () => {
  it('listy podle souborů', async () => {
    const m = mockSheets();
    const tabs = await m.listTabs('mock-tyden');
    expect(tabs.map((t) => t.title)).toEqual(['tyden-bez-hlavicky', 'tyden-bloky', 'tyden-hlavicka']);
    expect((await m.readTab('mock-tyden', tabs[2]))[0][1]).toBe('Cvik');
  });
});

describe('Šifrování tokenů', () => {
  it('tam a zpět, s náhodným IV', () => {
    const a = encrypt({ refresh_token: 'r' });
    expect(a).not.toBe(encrypt({ refresh_token: 'r' }));
    expect(decrypt(a)).toEqual({ refresh_token: 'r' });
    expect(a).not.toContain('r"');
  });
});
