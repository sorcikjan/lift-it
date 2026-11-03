/**
 * pnpm seed:exercises
 * Stáhne free-exercise-db (veřejná doména), přidá českou vrstvu ze seed/cs-exercises.json
 * a zapíše public/library/exercises.json (zabalená knihovna pro appku, funguje offline).
 * S proměnnou DATABASE_URL navíc upsertne cviky a globální aliasy do databáze.
 * Skript je opakovatelný: stejný vstup = stejný výstup, upserty podle id.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeName } from '../src/lib/normalize.ts';

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const root = process.cwd();
const cache = path.join(root, '.cache', 'free-exercise-db.json');

type Fedb = {
  id: string; name: string; equipment: string | null; category: string;
  primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[]; images: string[];
};
type Cs = { id: string; name_cs: string; aliases: string[]; steps_cs: string[]; type?: string; zkontrolovano: boolean };

async function loadFedb(): Promise<Fedb[]> {
  if (existsSync(cache) && !process.argv.includes('--refresh')) return JSON.parse(await readFile(cache, 'utf8'));
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`free-exercise-db: HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(path.dirname(cache), { recursive: true });
  await writeFile(cache, text);
  return JSON.parse(text);
}

function guessType(e: Fedb): string {
  if (['stretching', 'cardio'].includes(e.category)) return 'time';
  if (e.equipment === 'body only' || e.equipment === null) return 'reps';
  return 'weight_reps';
}

async function main() {
  const fedb = await loadFedb();
  const cs: { cviky: Cs[] } = JSON.parse(await readFile(path.join(root, 'seed', 'cs-exercises.json'), 'utf8'));
  const byId = new Map(fedb.map((e) => [e.id, e]));

  const missing = cs.cviky.filter((c) => !byId.has(c.id)).map((c) => c.id);
  if (missing.length) throw new Error(`Česká vrstva odkazuje na neexistující cviky: ${missing.join(', ')}`);
  const csById = new Map(cs.cviky.map((c) => [c.id, c]));

  const exercises = fedb.map((e) => {
    const c = csById.get(e.id);
    return {
      id: e.id,
      name_cs: c?.name_cs ?? '',
      name_en: e.name,
      type: c?.type ?? guessType(e),
      equipment: e.equipment,
      muscles: [...e.primaryMuscles, ...e.secondaryMuscles],
      images: e.images.map((i) => IMG + i),
      steps_cs: c?.steps_cs ?? [],
      steps_en: e.instructions,
      source: 'free-exercise-db',
      license: 'Public domain (Unlicense)',
      author: 'yuhonas/free-exercise-db',
      cs_reviewed: c?.zkontrolovano ?? false,
    };
  });

  const aliases: { text: string; exercise_id: string }[] = [];
  const seen = new Map<string, string>();
  for (const c of cs.cviky) {
    for (const a of [c.name_cs, ...c.aliases, byId.get(c.id)!.name]) {
      const text = normalizeName(a);
      if (!text) continue;
      const prev = seen.get(text);
      if (prev && prev !== c.id) throw new Error(`Alias „${a}“ patří ke dvěma cvikům: ${prev} a ${c.id}`);
      if (!prev) aliases.push({ text, exercise_id: c.id });
      seen.set(text, c.id);
    }
  }

  // České cviky první, aby je hledání a párování našlo dřív.
  exercises.sort((a, b) => Number(!!b.name_cs) - Number(!!a.name_cs) || a.name_en.localeCompare(b.name_en));
  const out = path.join(root, 'public', 'library', 'exercises.json');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ version: 1, exercises, aliases }));
  console.log(`Knihovna: ${exercises.length} cviků, ${cs.cviky.length} s češtinou, ${aliases.length} aliasů → ${path.relative(root, out)}`);

  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
    await sql`insert into exercises ${sql(exercises.map(({ cs_reviewed: _, ...e }) => e))}
      on conflict (id) do update set name_cs = excluded.name_cs, name_en = excluded.name_en, type = excluded.type,
        equipment = excluded.equipment, muscles = excluded.muscles, images = excluded.images,
        steps_cs = excluded.steps_cs, steps_en = excluded.steps_en`;
    for (const a of aliases) {
      await sql`insert into exercise_aliases (id, text, exercise_id, owner_id)
        values (gen_random_uuid(), ${a.text}, ${a.exercise_id}, null)
        on conflict (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), text)
        do update set exercise_id = excluded.exercise_id`;
    }
    await sql.end();
    console.log('Databáze: cviky a aliasy upsertnuté.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
