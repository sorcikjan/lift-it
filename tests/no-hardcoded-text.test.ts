import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Všechny texty rozhraní jsou v src/i18n/cs.json, ne natvrdo v komponentách. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
  });
}

describe('Texty jen z cs.json', () => {
  const all = [...files('src/app'), ...files('src/components')];
  it.each(all)('%s', (f) => {
    const offenders = readFileSync(f, 'utf8').split('\n').filter((line) => {
      if (line.includes('=>') || line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
      return />[^<>{}]*[A-Za-zÀ-ž]{3,}[^<>{}]*</.test(line) || /\s(placeholder|aria-label|title|alt)="[^"]*[A-Za-zÀ-ž]{3,}/.test(line);
    });
    expect(offenders).toEqual([]);
  });
});
