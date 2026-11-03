import cs from './cs.json';
import { plural } from '@/domain/format';

type Vars = Record<string, string | number>;

/** Text z cs.json podle cesty („run.jduNaTo“) s dosazením {proměnných}. */
export function t(key: string, vars?: Vars): string {
  let node: unknown = cs;
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  if (typeof node !== 'string') {
    if (process.env.NODE_ENV !== 'production') throw new Error(`Chybí text: ${key}`);
    return key;
  }
  return vars ? node.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : node;
}

/** Slovníkové hodnoty (svaly, vybavení) s fallbackem na původní text. */
export function tMaybe(key: string, fallback: string): string {
  try {
    return t(key);
  } catch {
    return fallback;
  }
}

export const cviku = (n: number) => plural(n, 'cvik', 'cviky', 'cviků');
export const serie = (n: number) => plural(n, 'série', 'série', 'sérií');
