'use client';
import type { SheetMapping } from '@/domain/plan/parse-sheet';

export interface SheetMeta { sheetUrl: string; sheetTab: string | null; spreadsheetId: string; mapping: SheetMapping | null }

/** Načtení přes odkaz na Google Sheet (A1) přijde ve fázi 2. */
export function SheetLinkInput(_: { onRows: (rows: string[][], meta: SheetMeta) => void }) {
  return null;
}
