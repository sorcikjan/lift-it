'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { pairSession, stravaStatus, type StravaStatus } from '@/client/strava';
import { t } from '@/i18n/t';

/** G3, G5: stav párování s hodinkami a tep a kalorie ve shrnutí. */
export function WatchPanel({ sessionId }: { sessionId: string }) {
  const session = useLiveQuery(() => db().sessions.get(sessionId), [sessionId]);
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void stravaStatus().then(setStatus); }, []);

  const pairing = session?.pairing_status ?? null;
  const connected = !!status?.connected;
  // Automaticky: hned po otevření a pak každou minutu, dokud se čeká na data z hodinek.
  useEffect(() => {
    if (!connected || !session || session.source === 'baseline' || pairing === 'paired' || pairing === 'not_found') return;
    let stop = false;
    const tick = async () => { if (!stop && navigator.onLine) { setBusy(true); await pairSession(sessionId); setBusy(false); } };
    void tick();
    const iv = setInterval(tick, 60_000);
    return () => { stop = true; clearInterval(iv); };
  }, [connected, sessionId, pairing, session?.source]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || session.source === 'baseline' || !status?.configured) return null;
  const retry = async () => { setBusy(true); await pairSession(sessionId); setBusy(false); };

  return (
    <section aria-labelledby="watch-h" data-testid="watch" className="mt-5 rounded-[18px] bg-grafit p-4">
      <h2 id="watch-h" className="font-display text-[24px] font-bold">{t('summary.hodinky')}</h2>
      {!connected ? (
        <>
          <p className="mt-1 text-[16px] text-ocel">{t('strava.propojitText')}</p>
          <Link href="/ucet" className="tap mt-2 inline-flex items-center rounded-2xl border border-linka px-4 text-[17px] font-semibold">{t('summary.hodinkyPropojit')}</Link>
        </>
      ) : pairing === 'paired' ? (
        <>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            <Stat label={t('summary.prumernyTep')} value={session.hr_avg} />
            <Stat label={t('summary.maxTep')} value={session.hr_max} />
            <Stat label={t('summary.kcal')} value={session.kcal} />
          </dl>
          <p className="mt-2 text-[15px] text-ocel">
            {t('strava.pripojeno')}{' · '}
            <a href={`https://www.strava.com/activities/${session.strava_activity_id}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">{t('strava.otevritAktivitu')}</a>
          </p>
        </>
      ) : (
        <>
          <p role="status" className="mt-1 text-[17px]">{pairing === 'not_found' ? t('summary.hodinkyNenalezeno') : t('summary.hodinkyCekam')}</p>
          <button type="button" onClick={retry} disabled={busy} className="tap mt-2 rounded-2xl border border-linka px-4 text-[17px] font-semibold disabled:opacity-50">{t('summary.hodinkyZkusit')}</button>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[14px] bg-guma p-2.5">
      <dt className="text-[13px] text-ocel">{label}</dt>
      <dd className="font-display text-[30px] font-bold leading-tight tabular">{value ?? '–'}</dd>
    </div>
  );
}
