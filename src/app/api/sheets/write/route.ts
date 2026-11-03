import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { parseSheetUrl, sheetsSource, sheetsWriter, SheetsError } from '@/integrations/google-sheets';
import { writebackCells, colLetter, type WritebackEntry } from '@/domain/plan/writeback';
import type { SheetMapping } from '@/domain/plan/parse-sheet';
import { t } from '@/i18n/t';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A9: zapíše odcvičené hodnoty do trenérova sheetu. Server si list přečte znovu (trenér ho mezitím mohl upravit),
 * spočítá buňky a zapíše jen sloupec „Odcvičeno“.
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    const { spreadsheetId } = parseSheetUrl(String(body.url ?? ''));
    const mapping = body.mapping as SheetMapping;
    const entries = (body.entries ?? []) as WritebackEntry[];
    if (!mapping?.columns || !Array.isArray(entries)) return Response.json({ error: 'bad_request' }, { status: 400 });
    const db = await getDb();
    const clientToken = req.headers.get('x-google-token');
    const src = await sheetsSource(db, user.id, { clientToken });
    const tabs = await src.listTabs(spreadsheetId);
    const tab = tabs.find((x) => x.title === body.tab) ?? (body.tab ? undefined : tabs[0]);
    if (!tab) throw new SheetsError('not_found');
    const rows = await src.readTab(spreadsheetId, tab);
    const cells = writebackCells(rows, mapping, entries, t('zapis.hlavicka'));
    await (await sheetsWriter(db, user.id, { clientToken })).writeCells(spreadsheetId, tab, cells);
    return Response.json({ written: cells.length, column: cells.length ? colLetter(cells[0].col) : null });
  } catch (e) {
    const code = e instanceof SheetsError ? e.code : 'unavailable';
    const status = code === 'google_login' ? 401 : code === 'bad_url' ? 400 : code === 'not_found' ? 404 : code === 'forbidden' || code === 'read_only' ? 403 : 502;
    return Response.json({ error: code }, { status });
  }
}
