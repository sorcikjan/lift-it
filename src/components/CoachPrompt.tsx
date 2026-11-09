'use client';
import { useEffect, useState } from 'react';
import { addCoachSession, dismissStrava, strayStrava, stravaStatus } from '@/client/strava';
import type { StravaActivity } from '@/integrations/strava/types';
import { dayLabel } from '@/domain/dates';
import { t } from '@/i18n/t';

/** Aktivita ve Stravě bez tréninku v appce: „Byl to trénink s trenérem?“ Jedním ťuknutím zapsat. */
export function CoachPrompt() {
  const [list, setList] = useState<StravaActivity[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let off = false;
    void stravaStatus().then(async (st) => { if (st?.connected && !off) { const l = await strayStrava(); if (!off) setList(l); } });
    return () => { off = true; };
  }, []);
  const a = list[0];
  if (!a) return null;
  const hr = a.average_heartrate != null ? ` · ${t('sTrenerem.tep', { n: Math.round(a.average_heartrate) })}` : '';
  return (
    <section data-testid="coach-prompt" aria-label={t('sTrenerem.nabidkaNadpis')} className="rise mt-4 rounded-[20px] border border-[#FC4C02]/40 bg-grafit p-4">
      <p className="text-[13px] font-bold uppercase tracking-[1.2px] text-[#FC7A3D]">{t('sTrenerem.nabidkaNadpis')}</p>
      <p className="mt-1.5 font-display text-[22px] font-bold tabular">{t('sTrenerem.radek', { day: dayLabel(a.start_date), min: Math.round(a.elapsed_time / 60) })}{hr}</p>
      <p className="mt-0.5 text-[16px] text-ocel">{t('sTrenerem.nabidkaOtazka')}</p>
      <div className="mt-3 grid grid-cols-[2fr_1fr] gap-2">
        <button type="button" disabled={busy} className="tap press rounded-2xl bg-modra-akce font-display text-[20px] font-bold disabled:opacity-50"
          onClick={async () => { setBusy(true); const id = await addCoachSession({ activity: a }); location.href = `/shrnuti?id=${id}`; }}>
          {t('sTrenerem.ano')}
        </button>
        <button type="button" disabled={busy} className="tap rounded-2xl border border-linka text-[17px] font-semibold text-ocel"
          onClick={async () => { await dismissStrava(a.id); setList(list.slice(1)); }}>
          {t('sTrenerem.ne')}
        </button>
      </div>
    </section>
  );
}
