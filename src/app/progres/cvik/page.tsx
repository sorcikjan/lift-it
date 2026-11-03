'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadExerciseProgress } from '@/client/progress';
import { exerciseName } from '@/client/library';
import { BottomNav } from '@/components/BottomNav';
import { TimeChart } from '@/components/charts/TimeChart';
import { Trophy } from '@/components/icons';
import { Page, PageTitle } from '@/components/ui';
import { fmtKg, fmtNum } from '@/domain/format';
import { shortDate } from '@/domain/dates';
import { bestText, pct } from '@/domain/progress-format';
import { t } from '@/i18n/t';

export default function ExerciseProgressPage() {
  return <Suspense><Detail /></Suspense>;
}

/** Detail cviku v Progresu (D1–D3): vývoj od prvního tréninku, změna v %, rekordy. */
function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const data = useLiveQuery(() => loadExerciseProgress(id), [id]);
  const [table, setTable] = useState(false);
  if (!data?.exercise) return <Page><PageTitle title={t('progres.nadpis')} back="/progres" /><BottomNav /></Page>;
  const { exercise, history, change, records } = data;
  const name = exerciseName(exercise);
  const hasE = history.some((h) => h.bestE1rm != null);
  const e1 = history.filter((h) => h.bestE1rm != null).map((h) => ({ date: h.date, value: Math.round(h.bestE1rm! * 10) / 10, detail: bestText(h) }));
  const maxW = history.filter((h) => h.maxWeight != null).map((h) => ({ date: h.date, value: h.maxWeight! }));
  const vol = history.filter((h) => h.volume > 0).map((h) => ({ date: h.date, value: h.volume }));
  const time = history.filter((h) => h.maxTime != null).map((h) => ({ date: h.date, value: h.maxTime! }));
  const reps = history.filter((h) => h.maxReps != null && h.maxWeight == null).map((h) => ({ date: h.date, value: h.maxReps! }));
  const first = history[0], last = history.at(-1)!;
  const bestE = Math.max(...e1.map((p) => p.value), 0);
  const pr = [...records].reverse().find((r) => r.type === 'weight' || r.type === 'reps');
  const bestSession = history.reduce((b, h) => ((h.bestE1rm ?? 0) > (b.bestE1rm ?? 0) ? h : b), history[0]);

  return (
    <Page>
      <PageTitle title={name} back="/progres" />
      {change != null && history.length > 1 && (
        <p className="flex items-baseline gap-2"><span className="font-display text-[56px] font-bold leading-none text-splneno tabular">{pct(change)}</span><span className="text-[17px] text-ocel">{t('progres.odZacatku')}</span></p>
      )}
      {hasE && first.bestE1rm != null && (
        <p className="mt-1 text-[16px] text-ocel">{t('progres.detail.odhad', { from: fmtNum(first.bestE1rm, 0), to: fmtNum(last.bestE1rm ?? first.bestE1rm, 0), start: bestText(first), date: shortDate(first.date) })}</p>
      )}

      {(pr || bestSession) && (
        <section className="mt-4 flex items-center gap-3 rounded-[20px] bg-grafit p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-splneno text-guma"><Trophy size={24} /></span>
          <div className="flex-1">
            <p className="text-[15px] text-ocel">{t('progres.detail.rekord')}</p>
            <p className="font-display text-[28px] font-bold tabular">{bestText(bestSession)}</p>
          </div>
          <span className="text-[15px] text-ocel">{shortDate(bestSession.date)}</span>
        </section>
      )}

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={() => setTable(!table)} className="tap text-[15px] text-ocel underline underline-offset-4">{table ? t('progres.detail.graf') : t('progres.detail.tabulka')}</button>
      </div>

      {table ? (
        <table className="w-full text-left text-[16px] tabular">
          <thead className="text-ocel"><tr><th className="py-2 font-medium">{t('progres.detail.datum')}</th><th className="font-medium">{t('progres.detail.serie')}</th><th className="text-right font-medium">1RM</th></tr></thead>
          <tbody>
            {[...history].reverse().map((h) => (
              <tr key={h.sessionId} className="border-t border-linka"><td className="py-2">{shortDate(h.date)}</td><td>{bestText(h)}</td><td className="text-right">{h.bestE1rm ? fmtNum(h.bestE1rm, 1) : '–'}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex flex-col gap-6">
          {hasE && (
            <section>
              <h2 className="text-[16px] font-semibold">{t('progres.detail.grafPopis')}</h2>
              <TimeChart label={t('progres.detail.grafPopis')} points={e1} unit={t('common.kg')}
                baseline={{ value: e1[0].value, label: t('progres.detail.vychozi', { w: fmtNum(e1[0].value, 0) }) }}
                record={e1.length > 1 ? { value: bestE, label: t('progres.detail.rekordLinka', { w: fmtNum(bestE, 0) }) } : undefined} />
            </section>
          )}
          {maxW.length > 0 && (
            <section><h2 className="text-[16px] font-semibold">{t('progres.detail.maxVaha')}</h2><TimeChart label={t('progres.detail.maxVaha')} points={maxW} unit={t('common.kg')} /></section>
          )}
          {vol.length > 0 && (
            <section><h2 className="text-[16px] font-semibold">{t('progres.detail.objem')}</h2><TimeChart label={t('progres.detail.objem')} points={vol} unit={t('common.kg')} /></section>
          )}
          {time.length > 0 && !hasE && (
            <section><h2 className="text-[16px] font-semibold">{t('library.typy.time')}</h2><TimeChart label={t('library.typy.time')} points={time} unit={t('common.s')} /></section>
          )}
          {reps.length > 0 && !hasE && (
            <section><h2 className="text-[16px] font-semibold">{t('summary.opakovani')}</h2><TimeChart label={t('summary.opakovani')} points={reps} unit={t('common.krat')} /></section>
          )}
          {data.hr.length > 0 && (
            <section><h2 className="text-[16px] font-semibold">{t('progres.detail.tep')}</h2><TimeChart label={t('progres.detail.tep')} points={data.hr} unit={t('common.bpm')} /></section>
          )}
        </div>
      )}

      <section className="mt-6">
        <h2 className="font-display text-[24px] font-bold">{t('progres.detail.posledni', { n: Math.min(5, history.length) })}</h2>
        <ul className="mt-2">
          {[...history].reverse().slice(0, 5).map((h) => (
            <li key={h.sessionId} className="flex min-h-12 items-center gap-3 border-b border-linka tabular">
              <span className="w-16 text-ocel">{shortDate(h.date)}</span>
              <span className="flex-1 font-semibold">{bestText(h)}</span>
              {h.sessionId === bestSession.sessionId && history.length > 1 && <span className="flex items-center gap-1 rounded-full bg-splneno px-2 text-[13px] font-bold text-guma"><Trophy size={14} />{t('progres.detail.rekordStitek')}</span>}
              {h.bestE1rm && <span className="text-ocel">{t('progres.detail.rm', { w: fmtNum(h.bestE1rm, 1) })}</span>}
            </li>
          ))}
        </ul>
      </section>

      {records.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-[24px] font-bold">{t('progres.detail.historieRekordu')}</h2>
          <ul className="mt-2">
            {[...records].reverse().map((r, i) => (
              <li key={i} className="flex min-h-12 items-center gap-3 border-b border-linka tabular">
                <span className="w-16 text-ocel">{shortDate(r.date)}</span>
                <span className="flex-1">{r.type === 'reps' ? t('progres.detail.rekordTyp.reps', { w: fmtKg(r.weight ?? 0) }) : t(`progres.detail.rekordTyp.${r.type}`)}</span>
                <span className="font-semibold">{r.type === 'reps' ? `${r.value}×` : `${fmtNum(r.value, 1)} kg`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomNav />
    </Page>
  );
}
