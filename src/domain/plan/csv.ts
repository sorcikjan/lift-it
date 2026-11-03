/** CSV (RFC 4180) a TSV ze schránky na tabulku řetězců. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const src = text.replace(/\r\n?/g, '\n');
  const d = delimiter ?? (src.split('\n', 5).some((l) => l.includes('\t')) ? '\t' : guessDelimiter(src));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === d) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

function guessDelimiter(src: string): string {
  const first = src.split('\n', 3).join('\n');
  const semi = (first.match(/;/g) ?? []).length;
  const comma = (first.match(/,/g) ?? []).length;
  return semi > comma ? ';' : ',';
}
