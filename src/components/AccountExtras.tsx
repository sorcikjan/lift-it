'use client';
import { useEffect, useState } from 'react';
import type { Me } from '@/client/me';
import { connectStrava, disconnectStrava, setWriteDescription, stravaStatus, type StravaStatus } from '@/client/strava';
import { Button, Card, Toast } from './ui';
import { t } from '@/i18n/t';

/** Účet: propojení se Stravou (G1, G4). Trenér a upozornění přijdou ve fázi 4. */
export function AccountExtras(_: { me: Me | null }) {
  const [st, setSt] = useState<StravaStatus | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void stravaStatus().then(setSt);
    setError(new URLSearchParams(location.search).get('strava') === 'chyba');
  }, []);
  if (!st?.configured) return null;
  return (
    <Card className="mt-4">
      <h2 className="font-display text-[24px] font-bold">{t('strava.nadpis')}</h2>
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
