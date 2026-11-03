/**
 * Párování názvu ze sheetu na knihovnu (A3): přesná shoda → alias → fuzzy návrh.
 * Vlastní aliasy uživatele mají přednost před globálními.
 */
import { normalizeName } from '@/lib/normalize';

export interface MatchIndexInput {
  exercises: { id: string; name_cs: string; name_en: string; owner_id?: string | null; archived?: boolean }[];
  aliases: { text: string; exercise_id: string; owner_id?: string | null }[];
}

export interface MatchResult {
  kind: 'exact' | 'alias' | 'fuzzy' | 'none';
  exerciseId: string | null;  // jistá shoda (exact/alias); u fuzzy null, dokud uživatel nepotvrdí
  suggestions: { exerciseId: string; score: number }[];
}

interface Entry { text: string; exerciseId: string; bigrams: Map<string, number>; tokens: Set<string> }

export interface MatchIndex {
  exact: Map<string, string>;
  ownAlias: Map<string, string>;
  globalAlias: Map<string, string>;
  entries: Entry[];
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const x = ` ${s} `;
  for (let i = 0; i < x.length - 1; i++) {
    const b = x.slice(i, i + 2);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return m;
}

function dice(a: Map<string, number>, b: Map<string, number>): number {
  let inter = 0, na = 0, nb = 0;
  for (const v of a.values()) na += v;
  for (const v of b.values()) nb += v;
  for (const [k, v] of a) inter += Math.min(v, b.get(k) ?? 0);
  return na + nb ? (2 * inter) / (na + nb) : 0;
}

export function buildMatchIndex(input: MatchIndexInput): MatchIndex {
  const exact = new Map<string, string>();
  const ownAlias = new Map<string, string>();
  const globalAlias = new Map<string, string>();
  const entries: Entry[] = [];
  const add = (text: string, id: string) => {
    if (!text) return;
    entries.push({ text, exerciseId: id, bigrams: bigrams(text), tokens: new Set(text.split(' ')) });
  };
  // Vlastní cviky první, aby vyhrály nad stejně pojmenovaným globálním.
  const sorted = [...input.exercises].filter((e) => !e.archived).sort((a, b) => Number(!!b.owner_id) - Number(!!a.owner_id));
  for (const e of sorted) {
    for (const n of [normalizeName(e.name_cs), normalizeName(e.name_en)]) {
      if (n && !exact.has(n)) exact.set(n, e.id);
      add(n, e.id);
    }
  }
  for (const a of input.aliases) {
    const t = normalizeName(a.text);
    (a.owner_id ? ownAlias : globalAlias).set(t, a.exercise_id);
    add(t, a.exercise_id);
  }
  return { exact, ownAlias, globalAlias, entries };
}

export function matchExercise(index: MatchIndex, raw: string, limit = 3): MatchResult {
  const n = normalizeName(raw);
  if (!n) return { kind: 'none', exerciseId: null, suggestions: [] };
  const own = index.ownAlias.get(n);
  if (own) return { kind: 'alias', exerciseId: own, suggestions: [] };
  const ex = index.exact.get(n);
  if (ex) return { kind: 'exact', exerciseId: ex, suggestions: [] };
  const al = index.globalAlias.get(n);
  if (al) return { kind: 'alias', exerciseId: al, suggestions: [] };

  const q = bigrams(n);
  const qTokens = new Set(n.split(' '));
  const best = new Map<string, number>();
  for (const e of index.entries) {
    let s = dice(q, e.bigrams);
    // Bonus za shodu celých slov (překlepy uvnitř slova řeší bigramy).
    let common = 0;
    for (const tk of qTokens) if (e.tokens.has(tk)) common++;
    s += 0.15 * (common / Math.max(qTokens.size, e.tokens.size));
    if (s > (best.get(e.exerciseId) ?? 0)) best.set(e.exerciseId, s);
  }
  const suggestions = [...best.entries()]
    .filter(([, s]) => s >= 0.45)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([exerciseId, score]) => ({ exerciseId, score: Math.round(score * 100) / 100 }));
  return { kind: suggestions.length ? 'fuzzy' : 'none', exerciseId: null, suggestions };
}
