import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'supabase');

/** Vrátí SQL migrací v pořadí podle názvu souboru. */
export async function migrationSql(): Promise<string[]> {
  const dir = path.join(ROOT, 'migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  return Promise.all(files.map((f) => readFile(path.join(dir, f), 'utf8')));
}

export async function authStubSql(): Promise<string> {
  return readFile(path.join(ROOT, 'dev', 'auth-stub.sql'), 'utf8');
}
