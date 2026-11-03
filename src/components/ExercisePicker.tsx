'use client';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { normalizeName } from '@/lib/normalize';
import { inputCls } from './ui';
import { t } from '@/i18n/t';

/** Výběr cviku z knihovny (párování při importu, ruční úprava plánu, editor trenéra). */
export function ExercisePicker({ onPick, initial = '' }: { onPick: (id: string) => void; initial?: string }) {
  const [q, setQ] = useState(initial);
  const all = useLiveQuery(() => db().exercises.toArray(), []);
  const aliases = useLiveQuery(() => db().exercise_aliases.toArray(), []);
  const list = useMemo(() => {
    const n = normalizeName(q);
    if (!all || n.length < 2) return [];
    const hit = new Set((aliases ?? []).filter((a) => a.text.includes(n)).map((a) => a.exercise_id));
    return all.filter((e) => !e.archived && (hit.has(e.id) || normalizeName(e.name_cs).includes(n) || normalizeName(e.name_en).includes(n)))
      .sort((a, b) => Number(!!b.name_cs) - Number(!!a.name_cs))
      .slice(0, 12);
  }, [all, aliases, q]);
  return (
    <div className="mt-2 flex flex-col gap-1">
      <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('library.hledatPlaceholder')} aria-label={t('library.hledat')} className={inputCls} />
      <ul className="flex flex-col">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e.id)} className="tap w-full border-b border-linka px-1 text-left text-[17px]">
              {exerciseName(e)} {e.name_cs && <span className="text-[14px] text-ocel">· {e.name_en}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
