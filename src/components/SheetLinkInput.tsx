'use client';
import { useState } from 'react';
import type { SheetMapping } from '@/domain/plan/parse-sheet';
import { authHeader, signInWithGoogle, supabase, supabaseEnabled } from '@/client/supabase';
import { getMeta, setMeta } from '@/client/db';
import { loadImportMapping } from '@/client/sheets';
import { Button, Card, inputCls } from './ui';
import { t } from '@/i18n/t';

export interface SheetMeta { sheetUrl: string; sheetTab: string | null; spreadsheetId: string; mapping: SheetMapping | null }
interface Tab { title: string; gid: number }

/** A1: odkaz na Google Sheet → výběr listu → buňky. Mapování z minula se použije samo (A2). */
export function SheetLinkInput({ onRows }: { onRows: (rows: string[][], meta: SheetMeta) => void }) {
  const [url, setUrl] = useState('');
  const [tabs, setTabs] = useState<Tab[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  const read = async (tab?: number) => {
    setBusy(true); setError(null); setNeedLogin(false);
    try {
      const session = (await supabase()?.auth.getSession())?.data.session;
      const res = await fetch('/api/sheets/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()), ...(session?.provider_token ? { 'x-google-token': session.provider_token } : {}) },
        body: JSON.stringify({ url, tab }),
      });
      const data = await res.json();
      if (res.status === 401) { setNeedLogin(true); return; }
      if (!res.ok) { setError(t('import.chybaSheet', { error: data.error ?? res.status })); return; }
      await setMeta('lastSheetUrl', url);
      if (data.tabs.length > 1 && tab == null) { setTabs(data.tabs); return; }
      onRows(data.rows, { sheetUrl: url, sheetTab: data.tab.title, spreadsheetId: data.spreadsheetId, mapping: await loadImportMapping(data.spreadsheetId) });
    } catch {
      setError(t('import.chybaSheet', { error: t('app.offline') }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-[24px] font-bold">{t('import.odkaz')}</h2>
      <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} onFocus={async () => { if (!url) setUrl((await getMeta<string>('lastSheetUrl')) ?? ''); }}
        aria-label={t('import.odkaz')} placeholder={t('import.odkazPlaceholder')} className={`${inputCls} mt-3`} />
      {tabs ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[15px] text-ocel">{t('import.list')}</p>
          {tabs.map((tb) => (
            <Button key={tb.gid} variant="light" disabled={busy} onClick={() => read(tb.gid)}>{tb.title}</Button>
          ))}
        </div>
      ) : (
        <Button className="mt-3 w-full" disabled={!url.trim() || busy} onClick={() => read()}>{t('import.nacist')}</Button>
      )}
      {needLogin && (
        <div className="mt-3">
          <p className="text-[15px] text-zluta">{t('import.prihlasitGoogle')}</p>
          {supabaseEnabled && <Button variant="light" className="mt-2 w-full" onClick={() => signInWithGoogle('/import')}>{t('auth.prihlasit')}</Button>}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[15px] text-zluta">{error}</p>}
    </Card>
  );
}
