/**
 * parseSheet(rows, mapping) → PlanWeekDraft
 * Čistá funkce: z buněk trenérova sheetu (API, CSV nebo vložená tabulka) udělá návrh týdne.
 * Nic nezahazuje: co nejde přečíst, skončí v issues a v náhledu se zvýrazní (A4).
 */
import { normalizeName } from '@/lib/normalize';
import { parseCzNumber, roundKg } from '../format';
import type { Blok } from '../types';

export type Field = 'exercise' | 'sets' | 'reps' | 'weight' | 'rest' | 'note' | 'workout' | 'blok' | 'ignore';

export interface SheetMapping {
  headerRow: number | null;          // index řádku s hlavičkou, null = bez hlavičky
  columns: Record<number, Field>;    // index sloupce → pole
}

export interface DraftSet {
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  timeS: number | null;
  toFailure: boolean;
}

export interface Issue {
  field: 'sets' | 'reps' | 'weight' | 'rest' | 'exercise';
  raw: string;
}

export interface DraftExercise {
  row: number;
  sourceName: string;
  blok: Blok | null;          // null = sheet blok neurčil (doplní assignBlocks)
  group: string | null;       // superserie A1/A2 → „A“
  sets: DraftSet[];
  restS: number | null;
  note: string | null;
  issues: Issue[];
  bodyweight: boolean;
}

export interface DraftWorkout {
  label: string;
  title: string | null;
  exercises: DraftExercise[];
}

export interface PlanWeekDraft {
  workouts: DraftWorkout[];
  issueCount: number;
}

// --- hlavičky a nadpisy -------------------------------------------------------------

const HEADER_WORDS: [Field, RegExp][] = [
  ['exercise', /^(cvik|cviky|nazev|nazev cviku|exercise|cviceni)$/],
  ['sets', /^(serie|pocet serii|sets|s)$/],
  ['reps', /^(opakovani|opak|pocet opakovani|reps|op|x)$/],
  ['weight', /^(vaha|kg|zatez|vaha kg|weight|zavazi)$/],
  ['rest', /^(pauza|odpocinek|rest|pauza s)$/],
  ['note', /^(poznamka|poznamky|note|komentar|technika)$/],
  ['workout', /^(trenink|den|workout|trening)$/],
  ['blok', /^(blok|cast|faze)$/],
];

export function headerField(cell: string): Field | null {
  const n = normalizeName(cell);
  for (const [f, re] of HEADER_WORDS) if (re.test(n)) return f;
  return null;
}

const DAYS = ['pondeli', 'utery', 'streda', 'ctvrtek', 'patek', 'sobota', 'nedele'];

/** „Trénink A“, „TRENINK B – nohy“, „Středa“ → nadpis tréninku. */
export function workoutHeading(cell: string): { label: string | null; title: string | null } | null {
  const n = normalizeName(cell);
  const m = n.match(/^(?:trenink|trening|workout|den)\s*([a-z0-9])\b/);
  if (m) {
    // „Trénink A – nohy“ → nadpis „nohy“ (štítek A se ukazuje zvlášť)
    const rest = cell.trim().replace(/^\S+\s*[A-Za-z0-9]\b\s*[-–—:.]?\s*/, '').trim();
    return { label: m[1].toUpperCase(), title: rest || null };
  }
  if (DAYS.some((d) => n === d || n.startsWith(d + ' '))) return { label: null, title: cell.trim() };
  return null;
}

/** „Úvod“, „Rozcvička“, „Hlavní část“, „Závěr“, „Protažení“ → blok. */
export function blokHeading(cell: string): Blok | null {
  const n = normalizeName(cell);
  if (/^(uvod|rozcvicka|rozcviceni|warm ?up|zahrati)$/.test(n)) return 'uvod';
  if (/^(hlavni cast|hlavni|main)$/.test(n)) return 'hlavni';
  if (/^(zaver|protazeni|cool ?down|strecink|zavrecna cast)$/.test(n)) return 'zaver';
  return null;
}

// --- buňky ----------------------------------------------------------------------------

const RANGE = /^(\d+)\s*[-–]\s*(\d+)$/;
const NUM = /^\d+$/;

/** Opakování: „10“, „8–10“, „max“, „30 s“, „10/10/8“. */
export function parseReps(raw: string): { reps: DraftSet[] | null; perSet: boolean } | null {
  const s = raw.trim().toLowerCase().replace(/×/g, 'x').replace(/(\d)\s*x$/, '$1');
  if (!s) return null;
  if (s.includes('/')) {
    const parts = s.split('/').map((p) => parseReps(p));
    if (parts.some((p) => !p || !p.reps)) return null;
    return { reps: parts.map((p) => p!.reps![0]), perSet: true };
  }
  const one = parseOneReps(s);
  return one ? { reps: [one], perSet: false } : null;
}

function parseOneReps(s: string): DraftSet | null {
  const base: DraftSet = { repsMin: null, repsMax: null, weightKg: null, timeS: null, toFailure: false };
  const t = s.trim().replace(/\s+/g, ' ');
  if (/^(max|amrap|do selhani|selhani)$/.test(t)) return { ...base, toFailure: true };
  const time = t.match(/^(\d+)\s*(s|sec|sek|vterin|sekund)$/) ?? null;
  if (time) return { ...base, timeS: Number(time[1]) };
  const min = t.match(/^(\d+(?:[.,]\d+)?)\s*(min|minut)$/);
  if (min) return { ...base, timeS: Math.round(Number(min[1].replace(',', '.')) * 60) };
  const r = t.match(RANGE);
  if (r) return { ...base, repsMin: Number(r[1]), repsMax: Number(r[2]) };
  if (NUM.test(t)) return { ...base, repsMin: Number(t), repsMax: Number(t) };
  return null;
}

/** Série × opakování v jedné buňce: „3x10“, „3×10“, „4 × 8–10“, „3x30 s“, „3 x max“. */
export function parseSetsReps(raw: string): { sets: number; set: DraftSet } | null {
  const s = raw.trim().toLowerCase().replace(/×/g, 'x');
  const m = s.match(/^(\d+)\s*x\s*(.+)$/);
  if (!m) return null;
  const set = parseOneReps(m[2]);
  return set ? { sets: Number(m[1]), set } : null;
}

/** Váha: „40“, „40 kg“, „22,5“, „40/45/50“, „BW“, prázdné. undefined = nečitelné. */
export function parseWeight(raw: string): { weights: (number | null)[]; bodyweight: boolean } | undefined {
  const s = raw.trim().toLowerCase();
  if (!s || /^(bw|vlastni vaha|vv|tv|telo|-|–|0)$/.test(normalizeName(s) || s)) return { weights: [null], bodyweight: true };
  const parts = s.replace(/kg/g, '').split('/').map((p) => p.trim());
  const nums = parts.map((p) => (/^\d+([.,]\d+)?$/.test(p) ? parseCzNumber(p) : null));
  if (nums.some((n) => n == null)) return undefined;
  return { weights: nums.map((n) => roundKg(n!)), bodyweight: false };
}

/** Pauza: „90“, „90 s“, „1:30“, „2 min“. */
export function parseRest(raw: string): number | null | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const mmss = s.match(/^(\d+):(\d{2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(s|sec|sek)?$/);
  if (m) return Math.round(Number(m[1].replace(',', '.')));
  const mins = s.match(/^(\d+(?:[.,]\d+)?)\s*min/);
  if (mins) return Math.round(Number(mins[1].replace(',', '.')) * 60);
  return undefined;
}

const GROUP_ONLY = /^[A-Z][1-9][.):]?$/;

/** „A1 Leg press“, „A2. Zakopávání“ → superserie A. */
export function splitGroup(name: string): { group: string | null; name: string } {
  const m = name.trim().match(/^([A-Z])\s?([1-9])[.):]?\s+(.+)$/);
  return m ? { group: m[1], name: m[3].trim() } : { group: null, name: name.trim() };
}

// --- hlavní funkce --------------------------------------------------------------------------

export function parseSheet(rows: string[][], mapping: SheetMapping): PlanWeekDraft {
  const col = (f: Field) => Object.entries(mapping.columns).filter(([, v]) => v === f).map(([k]) => Number(k));
  const [cEx] = col('exercise');
  const [cSets] = col('sets');
  const [cReps] = col('reps');
  const [cW] = col('weight');
  const [cRest] = col('rest');
  const cNote = col('note');
  const [cWorkout] = col('workout');
  const [cBlok] = col('blok');

  const textColsRight = (from: number) => Object.entries(mapping.columns)
    .filter(([k, v]) => Number(k) > from && (v === 'note' || v === 'ignore')).map(([k]) => Number(k)).sort((a, b) => a - b);

  const workouts: DraftWorkout[] = [];
  let current: DraftWorkout | null = null;
  let blok: Blok | null = null;
  let lastWorkoutCell = '';
  const nextLabel = () => String.fromCharCode(65 + workouts.length);
  const startWorkout = (label: string | null, title: string | null) => {
    current = { label: label ?? nextLabel(), title, exercises: [] };
    workouts.push(current);
    blok = null;
  };

  rows.forEach((r, i) => {
    if (mapping.headerRow != null && i <= mapping.headerRow) return;
    const cell = (c: number | undefined) => (c == null ? '' : (r[c] ?? '').trim());
    const nonEmpty = r.filter((c) => c.trim() !== '');

    // Sloupec „Trénink“ (A / B / Středa)
    if (cWorkout != null && cell(cWorkout) && cell(cWorkout) !== lastWorkoutCell) {
      lastWorkoutCell = cell(cWorkout);
      const h = workoutHeading(lastWorkoutCell);
      const letter = /^[a-z]$/i.test(lastWorkoutCell) ? lastWorkoutCell.toUpperCase() : null;
      startWorkout(letter ?? h?.label ?? null, h?.title ?? lastWorkoutCell);
    }

    // Řádek s jedinou vyplněnou buňkou může být nadpis tréninku nebo bloku.
    if (nonEmpty.length === 1) {
      const only = nonEmpty[0];
      const h = workoutHeading(only);
      if (h) { startWorkout(h.label, h.title); return; }
      const b = blokHeading(only);
      if (b) { blok = b; return; }
    }

    let rawName = cell(cEx);
    if (!rawName) return;
    // Označení superserie ve vlastním sloupci („A1“ | „Tlak na prsa“): název je v nejbližší textové buňce vpravo.
    let nameCol: number | null = null;
    if (GROUP_ONLY.test(rawName)) {
      nameCol = textColsRight(cEx).find((c) => cell(c)) ?? null;
      if (nameCol == null) return;
      rawName = `${rawName.replace(/[.):]$/, '')} ${cell(nameCol)}`;
    }
    if (headerField(rawName) === 'exercise') return; // opakovaná hlavička uvnitř listu
    const h = workoutHeading(rawName);
    if (h && !cell(cSets) && !cell(cReps)) { startWorkout(h.label, h.title); return; }
    const b = blokHeading(rawName);
    if (b && !cell(cSets) && !cell(cReps)) { blok = b; return; }

    if (!current) startWorkout(null, null);
    const ex = parseRow(rawName, cell(cSets), cell(cReps), cell(cW), cell(cRest), i);
    ex.blok = cBlok != null && cell(cBlok) ? blokHeading(cell(cBlok)) ?? blok : blok;
    ex.note = cNote.filter((c) => c !== nameCol).map((c) => cell(c).replace(/^\((.*)\)$/, '$1').trim()).filter(Boolean).join(' · ') || null;
    current!.exercises.push(ex);
  });

  const ws = workouts.filter((w) => w.exercises.length);
  ws.forEach(assignBlocks);
  return { workouts: ws, issueCount: ws.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.issues.length, 0), 0) };
}

function parseRow(rawName: string, rawSets: string, rawReps: string, rawW: string, rawRest: string, row: number): DraftExercise {
  const { group, name } = splitGroup(rawName);
  const issues: Issue[] = [];
  let count: number | null = null;
  let pattern: DraftSet[] | null = null;

  // „3x10“ může stát ve sloupci série i opakování
  const combined = parseSetsReps(rawSets) ?? parseSetsReps(rawReps);
  if (combined) {
    count = combined.sets;
    pattern = [combined.set];
  } else {
    if (rawSets) {
      const n = parseCzNumber(rawSets);
      if (n != null && /^\d+\s*(x|×|serie|série)?$/i.test(rawSets.trim())) count = n;
      else issues.push({ field: 'sets', raw: rawSets });
    }
    if (rawReps) {
      const r = parseReps(rawReps);
      if (r) {
        pattern = r.reps;
        if (r.perSet && count == null) count = r.reps!.length;
      } else issues.push({ field: 'reps', raw: rawReps });
    }
  }

  const w = parseWeight(rawW);
  if (w === undefined) issues.push({ field: 'weight', raw: rawW });
  const weights = w?.weights ?? [null];
  if (count == null) count = Math.max(pattern?.length ?? 0, weights.length, 1);
  if (!pattern) pattern = [{ repsMin: null, repsMax: null, weightKg: null, timeS: null, toFailure: false }];

  const sets: DraftSet[] = Array.from({ length: count }, (_, i) => ({
    ...pattern![Math.min(i, pattern!.length - 1)],
    weightKg: weights[Math.min(i, weights.length - 1)],
  }));

  const rest = parseRest(rawRest);
  if (rest === undefined) issues.push({ field: 'rest', raw: rawRest });

  return { row, sourceName: name, blok: null, group, sets, restS: rest ?? null, note: null, issues, bodyweight: !!w?.bodyweight };
}

/**
 * Bez označení bloků: první a poslední cvik pevně, zbytek hlavní část [PŘEDPOKLAD z PRD].
 * Částečně označený list: neoznačené cviky zdědí blok podle pozice.
 */
export function assignBlocks(w: DraftWorkout): void {
  const ex = w.exercises;
  if (ex.every((e) => e.blok == null)) {
    ex.forEach((e, i) => {
      e.blok = ex.length >= 3 && i === 0 ? 'uvod' : ex.length >= 3 && i === ex.length - 1 ? 'zaver' : 'hlavni';
    });
    // Superserie se nerozdělí mezi bloky: celá skupina dostane blok svého prvního cviku.
    ex.forEach((e, i) => {
      const prev = ex[i - 1];
      if (e.group && prev?.group === e.group) e.blok = prev.blok;
    });
    return;
  }
  ex.forEach((e) => { if (e.blok == null) e.blok = 'hlavni'; });
}

// --- automatické mapování ---------------------------------------------------------------------

/** Odhad mapování: hlavička, jinak podle obsahu sloupců. */
export function guessMapping(rows: string[][]): SheetMapping {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const fields = rows[i].map(headerField);
    if (fields.includes('exercise') && fields.filter(Boolean).length >= 2) {
      const columns: Record<number, Field> = {};
      fields.forEach((f, c) => { columns[c] = f ?? 'ignore'; });
      return { headerRow: i, columns };
    }
  }
  const width = Math.max(...rows.map((r) => r.length), 0);
  const columns: Record<number, Field> = {};
  const score = (c: number, test: (s: string) => boolean) => {
    const vals = rows.map((r) => r[c] ?? '').filter(Boolean);
    return vals.length ? vals.filter(test).length / vals.length : 0;
  };
  const taken = new Set<Field>();
  const count = (c: number, test: (s: string) => boolean) => rows.filter((r) => r[c] && test(r[c])).length;
  const pick = (f: Field, test: (s: string) => boolean, min = 0.5, byCount = false) => {
    let best = -1, bestScore = min, bestCount = 0;
    for (let c = 0; c < width; c++) {
      if (columns[c]) continue;
      const s = score(c, test);
      if (s <= min) continue;
      const n = count(c, test);
      // Cviky: vyhraje sloupec s nejvíc názvy (u sloučených buněk stojí pár názvů i ve vedlejším sloupci)
      if (byCount ? n > bestCount || (n === bestCount && s > bestScore) : s > bestScore) { best = c; bestScore = s; bestCount = n; }
    }
    if (best >= 0) { columns[best] = f; taken.add(f); }
  };
  const isName = (s: string) => /[a-zá-ž]{3,}/i.test(s) && !parseSetsReps(s) && parseWeight(s) === undefined;
  pick('exercise', isName, 0.4, true);
  pick('sets', (s) => !!parseSetsReps(s), 0.5);
  const combined = taken.has('sets'); // „3x10“: série i opakování v jednom sloupci
  if (!combined) pick('sets', (s) => /^\d$/.test(s.trim()), 0.6);
  if (!combined) pick('reps', (s) => !!parseReps(s) && !/kg/i.test(s), 0.6);
  pick('weight', (s) => /kg|,\d|\d\/\d|^bw$/i.test(s) || (parseWeight(s) !== undefined && Number(parseCzNumber(s)) > 4), 0.5);
  // Zbylé textové sloupce vpravo od cviků jsou poznámky trenéra („35 kg na každé straně“).
  const exCol = Number(Object.keys(columns).find((k) => columns[Number(k)] === 'exercise') ?? -1);
  for (let c = exCol + 1; c < width && exCol >= 0; c++) if (!columns[c] && count(c, (s) => /[a-zá-ž]{2,}/i.test(s)) > 0) columns[c] = 'note';
  for (let c = 0; c < width; c++) if (!columns[c]) columns[c] = 'ignore';
  return { headerRow: null, columns };
}
