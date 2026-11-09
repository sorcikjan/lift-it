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
import { profileSummary, strengthTrend } from '@/domain/profile';
import { doneSessions } from '@/client/repo';
import { PaidToggle } from '@/components/PaidToggle';
import { addCoachSession } from '@/client/strava';
import { shortDate } from '@/domain/dates';
import { dayLabel } from '@/domain/dates';
import { t } from '@/i18n/t';

const DNY = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];
/** „od listopadu 2026“: měsíc ve 2. pádě */
const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
/** „+6 %“, „−2 %“ */
const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))} %`;
const arrow = (x: number) => (x > 0.001 ? '↑ ' : x < -0.001 ? '↓ ' : '→ ');
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
  const p = useLiveQuery(async () => {
    const [sessions, sets] = await Promise.all([db().sessions.toArray(), db().logged_sets.toArray()]);
    return { ...profileSummary(sessions, sets), trend: strengthTrend(sessions, sets) };
  }, []);
  const history = useLiveQuery(doneSessions, []);

  const logout = async () => {
    await flush();
    await supabase()?.auth.signOut();
    await db().delete();
    location.href = '/';
  };
  const name = me && !me.dev ? me.name || me.email : null;
  const since = p?.since ? `${MESICE[new Date(p.since).getMonth()]} ${new Date(p.since).getFullYear()}` : null;

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
          {p.trend && (
            <Link href="/progres" data-testid="trend" className="rise mt-2 flex items-center justify-between gap-3 rounded-[20px] border border-hrana bg-grafit px-4 py-3.5" style={delay(2)}>
              <span>
                <small className="block text-[13px] font-bold uppercase tracking-[1.2px] text-modra-text">{t('profil.smer')}</small>
                <b className={`block whitespace-nowrap font-display text-[24px] leading-tight ${p.trend.change > 0.001 ? 'text-splneno-svetla' : ''}`}>
                  {arrow(p.trend.change)}{t('profil.smerHodnota', { change: pct(p.trend.change), date: shortDate(p.trend.since) })}
                </b>
                <small className="text-[14px] text-ocel">{t('profil.smerCviky', { up: p.trend.up, total: p.trend.total })}{p.trend.down ? t('profil.smerKlesa', { n: p.trend.down }) : ''}</small>
              </span>
              <span aria-label={t('profil.smerProgres')} className="text-[28px] text-ocel">›</span>
            </Link>
          )}
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

        <History list={history ?? []} />

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

type HistoryRow = Awaited<ReturnType<typeof doneSessions>>[number];

/** Odcvičené tréninky; s trenérem i s přepínačem Zaplaceno, nahoře souhrn nezaplacených. */
function History({ list }: { list: HistoryRow[] }) {
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const owed = list.filter((h) => h.coach && h.paid === false).reverse();
  return (
    <section className="mt-5" aria-label={t('profil.treninky')}>
      <h2 className="mb-2 font-display text-[22px] font-bold">{t('profil.treninky')}</h2>
      {owed.length > 0 && (
        <p data-testid="unpaid" className="mb-2 rounded-2xl border border-zluta/40 bg-zluta/10 px-4 py-3 text-[16px] text-zluta">
          {t('sTrenerem.nezaplacenoSouhrn', { list: owed.map((h) => shortDate(h.startedAt)).join(', ') })}
        </p>
      )}
      {list.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-[20px] border border-hrana bg-grafit">
          {list.map((h) => (
            <li key={h.id} className="flex items-center border-b border-hrana last:border-b-0">
              <Link href={`/shrnuti?id=${h.id}`} data-testid="history-row" className="tap flex min-w-0 flex-1 items-center justify-between gap-3 px-4">
                <span className="min-w-0 py-2.5"><span className="block truncate">{h.coach ? t('sTrenerem.nazev') : h.label ? t('profil.treninkRadek', { label: h.label }) : t('profil.bezPlanu')}</span><small className="block text-[14px] text-ocel">{dayLabel(h.startedAt)}</small></span>
                {!h.coach && <span className="whitespace-nowrap text-ocel tabular">{h.sets} {t('profil.serii')}</span>}
              </Link>
              {h.coach && <PaidToggle id={h.id} paid={!!h.paid} day={dayLabel(h.startedAt)} />}
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="mt-2 rounded-[20px] border border-hrana bg-grafit p-4">
          <p className="text-[15px] text-ocel">{t('sTrenerem.pridatText')}</p>
          <label className="mt-2 flex flex-col gap-1 text-[14px] text-ocel">{t('sTrenerem.den')}
            <input type="date" value={day} max={new Date().toLocaleDateString('sv-SE')} onChange={(e) => setDay(e.target.value)}
              className="h-12 rounded-xl border border-linka bg-guma px-3 text-[17px] text-white" /></label>
          <button type="button" disabled={!day} onClick={async () => { await addCoachSession({ day }); setAdding(false); }}
            className="tap press mt-3 w-full rounded-2xl bg-modra-akce font-display text-[20px] font-bold disabled:opacity-50">{t('sTrenerem.zapsat')}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="tap mt-2 w-full rounded-2xl border border-linka text-[16px] font-semibold text-ocel">{t('sTrenerem.pridat')}</button>
      )}
    </section>
  );
}
