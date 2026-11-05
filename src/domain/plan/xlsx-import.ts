import { readXlsx } from './xlsx';

export interface XlsxFile {
  name: string;
  data: ArrayBuffer | Uint8Array;
}

/**
 * Jeden nebo víc souborů XLSX → jedna mřížka pro parseSheet.
 * Trenér posílá každý trénink jako zvláštní soubor: před každý list se vloží nadpis „Trénink A – název souboru“.
 */
export async function filesToRows(files: XlsxFile[]): Promise<string[][]> {
  const rows: string[][] = [];
  let n = 0;
  for (const f of files) {
    const title = f.name.replace(/\.xlsx$/i, '').trim();
    for (const sheet of await readXlsx(f.data)) {
      if (!sheet.rows.some((r) => r.some((c) => c.trim()))) continue;
      const label = String.fromCharCode(65 + n++);
      rows.push([`Trénink ${label} – ${title}`]);
      rows.push(...sheet.rows);
    }
  }
  const width = Math.max(1, ...rows.map((r) => r.length));
  return rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
}
