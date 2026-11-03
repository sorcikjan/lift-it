'use client';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadProgress } from '@/client/progress';
import { exerciseName } from '@/client/library';
import { download, exportCsv } from '@/client/export';
import { BottomNav } from '@/components/BottomNav';
import { Sparkline } from '@/components/charts/Sparkline';
import { Check } from '@/components/icons';
import { Button, Page, PageTitle } from '@/components/ui';
import { shortDate } from '@/domain/dates';
import { bestText, pct } from '@/domain/progress-format';
import { t } from '@/i18n/t';

/** Progres (D2, D4): o kolik jsem silnější než na začátku. Seznam není graf, ale číslo + sparkline. */
export default function ProgressPage() {
  const data = useLiveQuery(loadProgress, []);
  return (
    <Page>
      <PageTitle title={t('progres.nadpis')} sub={t('progres.podnadpis')} />
      {data && !data.items.length && <p className="text-[17px] text-ocel">{t('progres.zadnaData')}</p>}
      {data && data.overall != null && (
        <section className="mb-4 rounded-[20px] bg-grafit p-4">
          <p className="font-display text-[30px] font-bold">{t('progres.souhrn', { pct: pct(data.overall) })}</p>
          <p className="text-[15px] text-ocel">{t('progres.souhrnPopis')}</p>
        </section>
      )}
      <ul className="flex flex-col">
        {data?.items.map((i) => (
          <li key={i.exercise.id}>
            <Link href={`/progres/cvik?id=${encodeURIComponent(i.exercise.id)}`} className="flex min-h-16 items-center gap-3 border-b border-linka py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-semibold">{exerciseName(i.exercise)}</span>
                <span className="block truncate text-[14px] text-ocel tabular">
                  {i.history.length > 1 ? t('progres.ted', { now: bestText(i.history.at(-1)), start: bestText(i.history[0]) }) : bestText(i.history[0])}
                </span>
              </span>
              <Sparkline values={i.series} />
              {i.change != null && i.history.length > 1 && (
                <span className={`w-16 text-right font-display text-[22px] font-bold tabular ${i.change > 0 ? 'text-splneno' : 'text-krida'}`}>{pct(i.change)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {!!data?.attendance.length && (
        <section className="mt-6">
          <h2 className="font-display text-[26px] font-bold">{t('progres.dochazka')}</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {data.attendance.slice(0, 8).map((w) => (
              <li key={w.week_start} className="flex min-h-12 items-center justify-between border-b border-linka">
                <span className="text-[16px]">{t('progres.dochazkaTyden', { date: shortDate(w.week_start) })}</span>
                <span className="flex items-center gap-2 font-display text-[20px] font-semibold tabular">
                  {w.done >= w.planned && w.planned > 0 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-splneno text-guma"><Check size={14} /></span>}
                  {t('home.tydenStav', { done: w.done, total: w.planned })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link href="/progres/mereni" className="tap flex items-center justify-center rounded-2xl border border-linka text-[17px]">{t('progres.mereni')}</Link>
        <Button variant="ghost" onClick={async () => { const { name, csv } = await exportCsv(); download(name, csv); }}>{t('progres.export')}</Button>
      </div>
      <BottomNav />
    </Page>
  );
}
