/** Česká čísla: desetinná čárka, mezera jako oddělovač tisíců (37,5 kg; 8 450 kg). */
export function fmtNum(n: number, maxDecimals = 2): string {
  const r = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  const [int, dec] = String(Math.abs(r)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (r < 0 ? '−' : '') + grouped + (dec ? ',' + dec : '');
}

export const fmtKg = (n: number) => fmtNum(n, 2);

/** Česká množná čísla: 1 série, 2–4 série, 5+ sérií. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n);
  if (a === 1) return one;
  if (a >= 2 && a <= 4) return few;
  return many;
}

/** Desetinné číslo z českého zápisu: „22,5“, „22.5“, „40 kg“. */
export function parseCzNumber(s: string): number | null {
  const m = s.replace(/\s/g, '').replace(',', '.').match(/^-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Váha na krok 0,25 kg (pravidlo datového modelu). */
export const roundKg = (n: number) => Math.round(n * 4) / 4;
