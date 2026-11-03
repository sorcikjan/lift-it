'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { useLibraryReady } from '@/client/hooks';
import { BottomNav } from '@/components/BottomNav';
import { ExerciseImages } from '@/components/ExerciseImages';
import { Page, PageTitle } from '@/components/ui';
import { t, tMaybe } from '@/i18n/t';

export default function ExercisePage() {
  return <Suspense><ExerciseDetail /></Suspense>;
}

/** Detail cviku (C3): obrázky, 3–5 kroků techniky česky, svaly, vybavení, video. */
function ExerciseDetail() {
  const id = useSearchParams().get('id') ?? '';
  const ready = useLibraryReady();
  const e = useLiveQuery(() => (ready ? db().exercises.get(id) : undefined), [id, ready]);
  if (!e) return <Page><PageTitle title={t('library.nadpis')} back="/knihovna" /><p className="text-ocel">{ready ? t('common.zadnaData') : t('common.nacitam')}</p><BottomNav /></Page>;
  return (
    <Page>
      <PageTitle title={exerciseName(e)} back="/knihovna" sub={e.name_cs ? e.name_en : undefined} />
      <ExerciseImages images={e.images} name={exerciseName(e)} tall />
      <section className="mt-5">
        <h2 className="font-display text-[26px] font-bold">{t('library.technika')}</h2>
        {e.steps_cs.length ? (
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-6 text-[18px] leading-snug">
            {e.steps_cs.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        ) : <p className="mt-1 text-[16px] text-ocel">{t('library.bezCestiny')}</p>}
        {e.cs_reviewed === false && e.steps_cs.length > 0 && <p className="mt-2 text-[14px] text-zluta">{t('library.kKontrole')}</p>}
        {!!e.steps_en.length && (
          <details className="mt-3 text-[16px] text-ocel">
            <summary className="tap flex items-center">{t('library.anglicky')}</summary>
            <ol className="list-decimal pl-6">{e.steps_en.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </details>
        )}
      </section>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-[16px]">
        <div><dt className="text-ocel">{t('library.svaly')}</dt><dd>{e.muscles.map((m) => tMaybe(`muscles.${m}`, m)).join(', ') || '–'}</dd></div>
        <div><dt className="text-ocel">{t('library.vybaveni')}</dt><dd>{tMaybe(`equipment.${e.equipment ?? 'none'}`, e.equipment ?? '–')}</dd></div>
        <div><dt className="text-ocel">{t('library.typ')}</dt><dd>{t(`library.typy.${e.type}`)}</dd></div>
        {e.video_url && <div><dt className="text-ocel">{t('library.video')}</dt><dd><a href={e.video_url} className="underline" target="_blank" rel="noreferrer">{t('library.video')}</a></dd></div>}
      </dl>
      {e.owner_id && <Link href={`/knihovna/novy?id=${encodeURIComponent(e.id)}`} className="tap mt-5 flex items-center justify-center rounded-2xl border border-linka text-[17px] text-ocel">{t('library.upravitCvik')}</Link>}
      <p className="mt-6 text-[13px] text-ocel">{t('library.zdroj', { source: e.source, license: e.license })}</p>
      <BottomNav />
    </Page>
  );
}
