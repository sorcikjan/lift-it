/**
 * readXlsx(bytes) → listy jako mřížka textů (stejný tvar jako CSV a Sheets API).
 * Bez knihovny: ZIP rozbalí DecompressionStream (prohlížeč i Node), XML přečtou regulární výrazy.
 * Stačí to na tabulky s textem a čísly; vzorce se berou jako uložená hodnota.
 */

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

export class XlsxError extends Error {}

export async function readXlsx(data: ArrayBuffer | Uint8Array): Promise<XlsxSheet[]> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const files = await unzip(bytes);
  const text = (p: string) => files.get(p) ?? null;

  const shared = parseSharedStrings(text('xl/sharedStrings.xml') ?? '');
  const workbook = text('xl/workbook.xml');
  if (!workbook) throw new XlsxError('not-xlsx');
  const rels = parseRels(text('xl/_rels/workbook.xml.rels') ?? '');

  const sheets: XlsxSheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decode(attr(m[1], 'name') ?? '');
    const rid = attr(m[1], 'r:id');
    const target = rid ? rels.get(rid) : undefined;
    if (!target) continue;
    const xml = text(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    if (xml) sheets.push({ name, rows: parseSheetXml(xml, shared) });
  }
  return sheets;
}

// --- XML -----------------------------------------------------------------------------

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name.replace(':', '\\:')}="([^"]*)"`));
  return m ? m[1] : null;
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Text z <t> uvnitř řetězce; fonetické nápovědy <rPh> se přeskočí. */
function runsText(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  return [...clean.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => runsText(m[1]));
}

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], 'Id');
    const target = attr(m[1], 'Target');
    if (id && target) map.set(id, target);
  }
  return map;
}

export function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Číslo z Excelu bez binárního šumu (0.30000000000000004 → „0.3“). */
function fmtNumber(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? String(Number(n.toPrecision(12))) : raw;
}

function parseSheetXml(xml: string, shared: string[]): string[][] {
  const grid: string[][] = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(row[1], 'r') ?? grid.length + 1) - 1;
    for (const c of (row[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], 'r');
      const type = attr(c[1], 't');
      const body = c[2] ?? '';
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val = '';
      if (type === 's' && v != null) val = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') val = runsText(body);
      else if (type === 'b' && v != null) val = v === '1' ? 'TRUE' : 'FALSE';
      else if (type === 'str' || type === 'e') val = decode(v ?? '');
      else if (v != null) val = fmtNumber(v);
      if (!val) continue;
      const ci = ref ? colIndex(ref) : (grid[r]?.length ?? 0);
      (grid[r] ??= [])[ci] = val;
    }
  }
  const width = Math.max(0, ...Array.from(grid, (r) => r?.length ?? 0)); // grid je řídké pole
  return Array.from({ length: grid.length }, (_, i) => Array.from({ length: width }, (_, c) => grid[i]?.[c] ?? ''));
}

// --- ZIP -------------------------------------------------------------------------------

async function unzip(b: Uint8Array): Promise<Map<string, string>> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new XlsxError('not-xlsx');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const utf8 = new TextDecoder();
  const out = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new XlsxError('broken');
    const method = dv.getUint16(p + 10, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = utf8.decode(b.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = b.subarray(start, start + size);
    if (method === 0) out.set(name, utf8.decode(raw));
    else if (method === 8) out.set(name, utf8.decode(await inflate(raw)));
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
