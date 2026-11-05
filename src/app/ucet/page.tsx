'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { onMe, refreshMe, type AuthMode, type Me } from '@/client/me';
import { signInWithGoogle, supabase, supabaseEnabled } from '@/client/supabase';
import { download, exportCsv } from '@/client/export';
import { db } from '@/client/db';
import { flush } from '@/client/sync';
import { BottomNav } from '@/components/BottomNav';
import { AccountExtras } from '@/components/AccountExtras';
import { Avatar, GoogleG } from '@/components/brand';
import { Back } from '@/components/icons';
import { Button, Card, Page } from '@/components/ui';
import { profileSummary } from '@/domain/profile';
import { t } from '@/i18n/t';

const DNY = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];
const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

/** Profil a účet (F1, redesign 11/2026): kdo jsem, tento týden, souhrn; Strava, trenér, export. */
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
  const p = useLiveQuery(async () => profileSummary(await db().sessions.toArray(), await db().logged_sets.toArray()), []);

  const logout = async () => {
    await flush();
    await supabase()?.auth.signOut();
    await db().delete();
    location.href = '/';
  };
  const name = me && !me.dev ? me.name || me.email : null;
  const since = p?.since ? new Date(p.since).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }) : null;

  return (
    <Page>
      <div className="flex min-h-12 items-center">
        <Link href="/" className="tap -ml-2 flex items-center gap-1.5 rounded-xl px-2 text-ocel"><Back size={22} />{t('profil.domu')}</Link>
      </div>

      <header className="rise mt-2 flex items-center gap-4">
        <Avatar name={name} size={76} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[36px] font-bold leading-none">{name ?? t('profil.host')}</h1>
          <p className="mt-1 text-ocel">{since ? t('profil.cviciOd', { date: since }) : t('profil.zatimNic')}</p>
        </div>
      </header>

      {p && (
        <>
          <div className="rise mt-5 grid grid-cols-7 gap-1.5" role="img" aria-label={t('profil.tydenAria', { n: p.week.filter(Boolean).length })} style={delay(1)}>
            {p.week.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 text-[12px] text-ocel">
                <i className={`aspect-square w-full rounded-[10px] border ${on ? 'border-splneno bg-splneno shadow-[0_0_12px_#34C77B55]' : 'border-hrana bg-grafit'}`} />
                {DNY[i]}
              </div>
            ))}
          </div>
          <div className="rise mt-3 grid grid-cols-3 gap-2 tabular" style={delay(2)}>
            {[[p.workouts, t('profil.treninku')], [p.sets, t('profil.serii')], [p.thisWeek, t('profil.tydne')]].map(([n, l]) => (
              <div key={String(l)} className="rounded-[20px] border border-hrana bg-grafit px-3 py-3.5">
                <b className="block font-display text-[36px] leading-none">{n}</b>
                <small className="text-[13px] text-ocel">{l}</small>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rise" style={delay(3)}>
        {!me && supabaseEnabled && (
          <Card className="mt-4">
            <p className="text-[16px] text-ocel">{t('profil.hostText')}</p>
            <button type="button" onClick={() => signInWithGoogle('/ucet')} className="press mt-3 flex h-14 w-full items-center justify-center gap-2.5 rounded-[18px] bg-krida font-display text-[22px] font-bold text-[#14171B]">
              <GoogleG size={20} />{t('auth.prihlasit')}
            </button>
          </Card>
        )}
        {!me && !supabaseEnabled && <Card className="mt-4"><p className="text-[16px] text-ocel">{t('auth.neprihlasen')}</p></Card>}
        {mode === 'dev' && <p className="mt-3 text-[14px] text-zluta">{t('auth.nenastaveno')}</p>}

        <AccountExtras me={me} />

        <Card className="mt-4 flex items-center justify-between gap-3">
          <div><p className="font-semibold">{t('profil.displej')}</p><p className="text-[14px] text-ocel">{t('profil.displejText')}</p></div>
          <span className="whitespace-nowrap text-[15px] font-semibold text-splneno-svetla">{t('profil.zapnuto')}</span>
        </Card>

        <h2 className="mb-2 mt-6 font-display text-[22px] font-bold">{t('profil.nastaveni')}</h2>
        <div className="flex flex-col gap-3">
          <Link href="/import?historie=1" className="tap flex items-center justify-center rounded-2xl border border-linka text-[17px]">{t('import.historie')}</Link>
          <Button variant="ghost" onClick={async () => { const { name: n, csv } = await exportCsv(); download(n, csv); }}>{t('progres.export')}</Button>
          {supabaseEnabled && me && <Button variant="ghost" onClick={logout}>{t('auth.odhlasit')}</Button>}
        </div>
      </div>
      <BottomNav />
    </Page>
  );
}
