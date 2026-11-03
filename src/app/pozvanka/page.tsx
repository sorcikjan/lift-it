'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { onMe, refreshMe, type Me } from '@/client/me';
import { acceptInvite, inviteInfo } from '@/client/coach';
import { signInWithGoogle, supabaseEnabled } from '@/client/supabase';
import { Button, LinkButton, Page, PageTitle, Toast } from '@/components/ui';
import { t } from '@/i18n/t';

export default function InvitePage() {
  return <Suspense><Invite /></Suspense>;
}

/** E2: klient přijme pozvánku od trenéra. */
function Invite() {
  const token = useSearchParams().get('token') ?? '';
  const [info, setInfo] = useState<{ coach_name: string; valid: boolean } | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  useEffect(() => { const off = onMe((m) => setMe(m)); return () => { off(); }; }, []);
  useEffect(() => { inviteInfo(token).then(setInfo).catch(() => setInfo({ coach_name: '', valid: false })); }, [token]);

  const accept = async () => {
    try { await acceptInvite(token); await refreshMe(); setState('done'); } catch { setState('error'); }
  };

  return (
    <Page nav={false}>
      <PageTitle title={t('coach.pozvanka')} />
      {info && !info.valid && state !== 'done' && <Toast tone="info">{t('coach.neplatna')}</Toast>}
      {info?.valid && state === 'idle' && (
        <>
          <p className="text-[19px]">{t('coach.prijmoutText', { name: info.coach_name })}</p>
          {me ? <Button big className="mt-6" onClick={accept}>{t('coach.prijmout')}</Button>
            : supabaseEnabled ? <Button big className="mt-6" onClick={() => signInWithGoogle(`/pozvanka?token=${encodeURIComponent(token)}`)}>{t('coach.prihlasitPrijmout')}</Button>
            : null}
        </>
      )}
      {state === 'error' && <Toast tone="info">{t('coach.neplatna')}</Toast>}
      {state === 'done' && (
        <>
          <Toast>{t('coach.prijato')}</Toast>
          <LinkButton href="/" big variant="done" className="mt-6">{t('common.hotovo')}</LinkButton>
        </>
      )}
    </Page>
  );
}
