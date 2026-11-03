import { SheetsError } from './types';

/** https://docs.google.com/spreadsheets/d/<id>/edit#gid=<gid> → { spreadsheetId, gid } */
export function parseSheetUrl(url: string): { spreadsheetId: string; gid: number | null } {
  const m = url.trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{10,})/) ?? url.trim().match(/^([a-zA-Z0-9_-]{25,})$/);
  if (!m) throw new SheetsError('bad_url');
  const gid = url.match(/[#?&]gid=(\d+)/)?.[1];
  return { spreadsheetId: m[1], gid: gid ? Number(gid) : null };
}
