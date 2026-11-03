/**
 * A9: zpětný zápis odcvičených hodnot do trenérova sheetu. Čistá funkce:
 * z aktuálního obsahu listu a mapování spočítá, do kterých buněk co zapsat.
 * Píše se do jednoho sloupce „Odcvičeno“ za daty (nebo do už existujícího), na řádek cviku. Nic jiného se nepřepíše.
 */
import { normalizeName } from '@/lib/normalize';
import { setsText, type SetLike } from '../sets-text';
import { parseSheet, type SheetMapping } from './parse-sheet';

export interface WritebackEntry { workoutLabel: string; position: number; sourceName: string; sets: SetLike[] }
export interface CellUpdate { row: number; col: number; value: string }

export function writebackColumn(rows: string[][], mapping: SheetMapping, header: string): number {
  if (mapping.headerRow != null) {
    const h = rows[mapping.headerRow] ?? [];
    const i = h.findIndex((c) => normalizeName(c) === normalizeName(header));
    if (i >= 0) return i;
  }
  return Math.max(0, ...rows.map((r) => {
    let n = r.length;
    while (n > 0 && !(r[n - 1] ?? '').trim()) n--;
    return n;
  }));
}

export function writebackCells(rows: string[][], mapping: SheetMapping, entries: WritebackEntry[], header: string): CellUpdate[] {
  const draft = parseSheet(rows, mapping);
  const col = writebackColumn(rows, mapping, header);
  const out: CellUpdate[] = [];
  if (mapping.headerRow != null) out.push({ row: mapping.headerRow, col, value: header });
  for (const e of entries) {
    if (!e.sets.length) continue;
    const w = draft.workouts.find((x) => x.label === e.workoutLabel) ?? (draft.workouts.length === 1 ? draft.workouts[0] : undefined);
    if (!w) continue;
    const n = normalizeName(e.sourceName);
    const byPos = w.exercises[e.position];
    const ex = byPos && normalizeName(byPos.sourceName) === n ? byPos : w.exercises.find((x) => normalizeName(x.sourceName) === n);
    if (!ex) continue;
    out.push({ row: ex.row, col, value: setsText(e.sets) });
  }
  return out;
}

/** Index sloupce → písmena A1 notace (0 → A, 26 → AA). */
export function colLetter(col: number): string {
  let s = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
