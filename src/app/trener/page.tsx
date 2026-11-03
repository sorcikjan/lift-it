'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onMe, type Me } from '@/client/me';
import { becomeCoach, createInvite, people, type ClientSummary } from '@/client/coach';
import { BottomNav } from '@/components/BottomNav';
import { Users } from '@/components/icons';
import { Button, Card, Page, PageTitle, Toast } from '@/components/ui';
import { shortDate } from '@/domain/dates';
import { t } from '@/i18n/t';

/** E2: trenér — klienti a pozvánka. */
export default function CoachPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const off = onMe((m) => setMe(m)); return () => { off(); }; }, []);
  const isCoach = !!me?.roles?.includes('coach');
  useEffect(() => {
    if (isCoach) people().then((p) => setClients(p.clients)).catch(() => setError(t('coach.offline')));
  }, [isCoach]);

  const doInvite = async () => {
    try {
      const { url } = await createInvite();
      setInvite(url);
      await navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
    } catch { setError(t('coach.offline')); }
  };

  return (
    <Page>
      <PageTitle title={t('coach.nadpis')} />
      {error && <Toast tone="info">{error}</Toast>}
      {me && !isCoach && (
        <Card>
          <p className="text-[17px]">{t('coach.staneSeTreneremText')}</p>
          <Button className="mt-3 w-full" onClick={() => becomeCoach().catch(() => setError(t('coach.offline')))}>{t('coach.staneSeTrenerem')}</Button>
        </Card>
      )}
      {isCoach && (
        <>
          <Button className="w-full" onClick={doInvite}><Users size={24} />{t('coach.pozvat')}</Button>
          {invite && (
            <Card className="mt-3">
              <p className="text-[15px] text-ocel">{t('coach.pozvankaText')}</p>
              <p data-testid="invite-url" className="mt-2 break-all font-mono text-[14px]">{invite}</p>
              {copied && <div className="mt-2"><Toast>{t('coach.pozvankaZkopirovana')}</Toast></div>}
            </Card>
          )}
          <ul aria-label={t('coach.nadpis')} className="mt-5 flex flex-col">
            {clients?.map((c) => (
              <li key={c.id}>
                <Link href={`/trener/klient?id=${c.id}`} className="flex min-h-16 flex-col justify-center border-b border-linka py-3">
                  <span className="text-[19px] font-semibold">{c.name || c.email}</span>
                  <span className="text-[15px] text-ocel">
                    {c.lastSession ? t('coach.posledniTrenink', { date: shortDate(c.lastSession) }) : t('coach.zadneTreninky')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {clients && !clients.length && <p className="mt-3 text-[17px] text-ocel">{t('coach.zadniKlienti')}</p>}
        </>
      )}
      <BottomNav />
    </Page>
  );
}
