'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onMe, refreshMe, type AuthMode, type Me } from '@/client/me';
import { signInWithGoogle, supabase, supabaseEnabled } from '@/client/supabase';
import { download, exportCsv } from '@/client/export';
import { db } from '@/client/db';
import { flush } from '@/client/sync';
import { BottomNav } from '@/components/BottomNav';
import { AccountExtras } from '@/components/AccountExtras';
import { Button, Card, Page, PageTitle } from '@/components/ui';
import { t } from '@/i18n/t';

/** Účet (F1): přihlášení Googlem, export dat (D5) a nastavení integrací. */
export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<AuthMode>('none');
  useEffect(() => { const off = onMe((m, md) => { setMe(m); setMode(md); }); return () => { off(); }; }, []);
  useEffect(() => { void refreshMe(); }, []);
  // Po přihlášení Googlem zpět tam, odkud uživatel přišel (třeba pozvánka od trenéra)
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('next');
    if (me && next && next.startsWith('/') && !next.startsWith('//') && next !== '/ucet') location.replace(next);
  }, [me]);

  const logout = async () => {
    await flush();
    await supabase()?.auth.signOut();
    await db().delete();
    location.href = '/';
  };

  return (
    <Page>
      <PageTitle title={t('auth.ucet')} back="/" />
      <Card>
        {me ? <p className="text-[18px] font-semibold">{t('auth.prihlasen', { name: me.name || me.email })}</p> : <p className="text-[16px] text-ocel">{t('auth.neprihlasen')}</p>}
        {mode === 'dev' && <p className="mt-1 text-[14px] text-zluta">{t('auth.nenastaveno')}</p>}
        <div className="mt-3">
          {supabaseEnabled && !me && <Button className="w-full" onClick={() => signInWithGoogle('/ucet')}>{t('auth.prihlasit')}</Button>}
          {supabaseEnabled && me && <Button variant="ghost" className="w-full" onClick={logout}>{t('auth.odhlasit')}</Button>}
        </div>
      </Card>
      <AccountExtras me={me} />
      <div className="mt-4 flex flex-col gap-3">
        <Link href="/import?historie=1" className="tap flex items-center justify-center rounded-2xl border border-linka text-[17px]">{t('import.historie')}</Link>
        <Button variant="ghost" onClick={async () => { const { name, csv } = await exportCsv(); download(name, csv); }}>{t('progres.export')}</Button>
      </div>
      <BottomNav />
    </Page>
  );
}
