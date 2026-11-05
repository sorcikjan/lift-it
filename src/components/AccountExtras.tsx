'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Me } from '@/client/me';
import { connectStrava, disconnectStrava, setWriteDescription, stravaStatus, type StravaStatus } from '@/client/strava';
import { becomeCoach, enablePush, endCoaching, people, pushEnabled, pushSupported, type Person } from '@/client/coach';
import { Button, Card, Toast } from './ui';
import { t } from '@/i18n/t';

/** Účet: Strava (G1, G4), trenér (E2) a upozornění (E6). */
export function AccountExtras({ me }: { me: Me | null }) {
  return (
    <>
      {me && <CoachCard me={me} />}
      {me && <PushCard />}
      <StravaCard />
    </>
  );
}

function CoachCard({ me }: { me: Me }) {
  const [coaches, setCoaches] = useState<Person[]>([]);
  const isCoach = !!me.roles?.includes('coach');
  useEffect(() => { people().then((p) => setCoaches(p.coaches)).catch(() => {}); }, [me.id]);
  return (
    <Card className="mt-4">
      {coaches.map((c) => (
        <div key={c.id} className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[17px]">{t('coach.mojiTreneri')}: <b>{c.name || c.email}</b></p>
          <button type="button" className="tap px-2 text-[15px] text-ocel underline underline-offset-4"
            onClick={async () => { await endCoaching(c.id).catch(() => {}); setCoaches(coaches.filter((x) => x.id !== c.id)); }}>{t('coach.ukoncitSpolupraci')}</button>
        </div>
      ))}
      {isCoach
        ? <p className="text-[17px]">{t('coach.jsiTrener')} <Link href="/trener" className="underline underline-offset-4">{t('coach.nadpis')}</Link></p>
        : (
          <>
            <p className="text-[16px] text-ocel">{t('coach.staneSeTreneremText')}</p>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => becomeCoach().catch(() => {})}>{t('coach.staneSeTrenerem')}</Button>
          </>
        )}
    </Card>
  );
}

function PushCard() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { void pushEnabled().then(setOn); }, []);
  if (!pushSupported()) return null;
  return (
    <Card className="mt-4">
      <h2 className="font-display text-[24px] font-bold">{t('coach.notifikace')}</h2>
      {on ? <p className="mt-1 text-[17px] text-splneno">{t('coach.notifikaceZapnute')}</p>
        : <Button className="mt-2 w-full" onClick={async () => setOn(await enablePush().catch(() => false))}>{t('coach.zapnoutNotifikace')}</Button>}
    </Card>
  );
}

function StravaCard() {
  const [st, setSt] = useState<StravaStatus | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void stravaStatus().then(setSt);
    setError(new URLSearchParams(location.search).get('strava') === 'chyba');
  }, []);
  if (!st) return null;
  const head = (
    <div className="flex items-center gap-3">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-[#FC4C02]" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M10 2l-6 12h4l2-4 2 4h4z" /><path d="M15.5 14l-2 4-2-4h-3l5 10 5-10z" opacity=".7" /></svg>
      </span>
      <h2 className="font-display text-[24px] font-bold">{t('strava.nadpis')}</h2>
    </div>
  );
  if (!st.configured) return <Card className="mt-4">{head}<p className="mt-2 text-[16px] text-ocel">{t('profil.stravaBrzy')}</p></Card>;
  return (
    <Card className="mt-4">
      {head}
      {error && <div className="mt-2"><Toast tone="info">{t('strava.chybaPropojeni')}</Toast></div>}
      {st.connected ? (
        <>
          <p className="mt-1 text-[17px] text-splneno">{t('strava.propojeno')}</p>
          <label className="tap mt-2 flex items-center gap-3 text-[17px]">
            <input type="checkbox" checked={st.writeDescription} className="h-7 w-7 flex-none accent-modra-akce"
              onChange={async (e) => { const on = e.target.checked; setSt({ ...st, writeDescription: on }); await setWriteDescription(on); }} />
            {t('strava.zapisPopisu')}
          </label>
          <Button variant="ghost" className="mt-2 w-full" onClick={async () => { await disconnectStrava(); setSt({ ...st, connected: false }); }}>{t('strava.odpojit')}</Button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[16px] text-ocel">{t('strava.propojitText')}</p>
          <Button className="mt-3 w-full" onClick={async () => setError(!(await connectStrava()))}>{t('strava.propojit')}</Button>
        </>
      )}
    </Card>
  );
}
