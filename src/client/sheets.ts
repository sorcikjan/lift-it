'use client';
import type { SheetMapping } from '@/domain/plan/parse-sheet';
import { db } from './db';
import { localUserId, save } from './repo';
import { uuid } from './uuid';

/** Mapování sloupců se uloží a příště použije samo (A2). */
export async function saveImportMapping(spreadsheetId: string, mapping: SheetMapping) {
  const existing = await db().import_mappings.where('spreadsheet_id').equals(spreadsheetId).first();
  await save('import_mappings', [{ id: existing?.id ?? uuid(), owner_id: await localUserId(), spreadsheet_id: spreadsheetId, mapping, layout: {} }]);
}

export async function loadImportMapping(spreadsheetId: string): Promise<SheetMapping | null> {
  const m = await db().import_mappings.where('spreadsheet_id').equals(spreadsheetId).first();
  return (m?.mapping as SheetMapping) ?? null;
}
