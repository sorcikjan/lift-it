'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { useLibraryReady } from '@/client/hooks';
import { BottomNav } from '@/components/BottomNav';
import { Plus } from '@/components/icons';
import { Page, PageTitle, inputCls } from '@/components/ui';
import { normalizeName } from '@/lib/normalize';
import { cviku, t, tMaybe } from '@/i18n/t';
import type { Exercise } from '@/domain/types';

/** Knihovna (C1, C5): hledání a filtry podle svalu a vybavení. */
export default function LibraryPage() {
  const ready = useLibraryReady();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equip, setEquip] = useState('');
  const all = useLiveQuery(() => (ready ? db().exercises.toArray() : Promise.resolve([] as Exercise[])), [ready]);
  const aliases = useLiveQuery(() => db().exercise_aliases.toArray(), []);

  const list = useMemo(() => {
    if (!all) return [];
    const n = normalizeName(q);
    const aliasHit = new Set((aliases ?? []).filter((a) => n && a.text.includes(n)).map((a) => a.exercise_id));
    return all.filter((e) => !e.archived)
      .filter((e) => !muscle || e.muscles.includes(muscle))
      .filter((e) => !equip || (e.equipment ?? 'none') === equip)
      .filter((e) => !n || normalizeName(e.name_cs).includes(n) || normalizeName(e.name_en).includes(n) || aliasHit.has(e.id))
      .sort((a, b) => Number(!!b.owner_id) - Number(!!a.owner_id) || Number(!!b.name_cs) - Number(!!a.name_cs) || exerciseName(a).localeCompare(exerciseName(b), 'cs'))
      .slice(0, 120);
  }, [all, aliases, q, muscle, equip]);

  const muscles = useMemo(() => [...new Set((all ?? []).flatMap((e) => e.muscles))].sort(), [all]);
  const equipment = useMemo(() => [...new Set((all ?? []).map((e) => e.equipment ?? 'none'))].sort(), [all]);

  return (
    <Page>
      <PageTitle title={t('library.nadpis')} right={
        <Link href="/knihovna/novy" aria-label={t('library.novyCvik')} className="tap flex items-center justify-center rounded-2xl bg-grafit"><Plus size={26} /></Link>
      } />
      <label className="sr-only" htmlFor="q">{t('library.hledat')}</label>
      <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('library.hledatPlaceholder')} className={inputCls} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select aria-label={t('library.sval')} value={muscle} onChange={(e) => setMuscle(e.target.value)} className={inputCls}>
          <option value="">{t('library.sval')}: {t('library.vsechny')}</option>
          {muscles.map((m) => <option key={m} value={m}>{tMaybe(`muscles.${m}`, m)}</option>)}
        </select>
        <select aria-label={t('library.vybaveni')} value={equip} onChange={(e) => setEquip(e.target.value)} className={inputCls}>
          <option value="">{t('library.vybaveni')}: {t('library.vsechny')}</option>
          {equipment.map((m) => <option key={m} value={m}>{tMaybe(`equipment.${m}`, m)}</option>)}
        </select>
      </div>
      <p className="mt-3 text-[14px] text-ocel">{t('library.vysledky', { n: list.length, cviku: cviku(list.length) })}</p>
      <ul className="mt-1 flex flex-col">
        {list.map((e) => (
          <li key={e.id}>
            <Link href={`/knihovna/cvik?id=${encodeURIComponent(e.id)}`} className="flex min-h-14 items-center gap-3 border-b border-linka py-2">
              {e.images[0]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={e.images[0]} alt="" loading="lazy" className="h-12 w-12 flex-none rounded-xl bg-grafit object-cover" />
                : <span className="h-12 w-12 flex-none rounded-xl bg-grafit" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-semibold">{exerciseName(e)}</span>
                <span className="block truncate text-[14px] text-ocel">
                  {e.owner_id ? t('library.vlastni') : e.name_cs ? e.name_en : tMaybe(`equipment.${e.equipment ?? 'none'}`, e.equipment ?? '')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <BottomNav />
    </Page>
  );
}
