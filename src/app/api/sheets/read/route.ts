import { getUser, unauthorized } from '@/server/auth';
import { getDb } from '@/server/db';
import { parseSheetUrl, sheetsSource, SheetsError } from '@/integrations/google-sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A1: přečte list trenérova sheetu. Vrací seznam listů a buňky vybraného listu. */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    const { spreadsheetId, gid } = parseSheetUrl(String(body.url ?? ''));
    const db = await getDb();
    const src = await sheetsSource(db, user.id, { clientToken: req.headers.get('x-google-token'), gid });
    const tabs = await src.listTabs(spreadsheetId);
    const wanted = body.tab ?? gid;
    const tab = tabs.find((t) => t.gid === wanted || t.title === wanted) ?? tabs[0];
    if (!tab) throw new SheetsError('not_found');
    const rows = await src.readTab(spreadsheetId, tab);
    return Response.json({ spreadsheetId, tabs, tab, rows });
  } catch (e) {
    const code = e instanceof SheetsError ? e.code : 'unavailable';
    const status = code === 'google_login' ? 401 : code === 'bad_url' ? 400 : code === 'not_found' ? 404 : code === 'forbidden' ? 403 : 502;
    return Response.json({ error: code }, { status });
  }
}
