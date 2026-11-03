'use client';
import { useState } from 'react';
import { db } from '@/client/db';
import { localUserId, save } from '@/client/repo';
import { flush, syncStatus } from '@/client/sync';
import { uuid } from '@/client/uuid';
import { Share } from './icons';
import { Button } from './ui';
import { t } from '@/i18n/t';

function token(): string {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** E1: odkaz na shrnutí tréninku bez přihlášení (trenér nemusí nic instalovat). */
export function ShareButton({ sessionId, label }: { sessionId: string; label: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const share = async () => {
    if (!navigator.onLine) { setMsg(t('summary.sdiletOffline')); return; }
    let link = await db().share_links.where('session_id').equals(sessionId).filter((l) => !l.archived).first();
    if (!link) {
      link = { id: uuid(), owner_id: await localUserId(), session_id: sessionId, program_id: null, token: token(), expires_at: null, archived: false };
      await save('share_links', [link as unknown as { id: string }]);
    }
    await flush();
    if (syncStatus().lastError === 'unauthorized') { setMsg(t('summary.sdiletPrihlaseni')); return; }
    const url = `${location.origin}/s/${link.token}`;
    const text = t('summary.sdiletText', { label });
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { /* zrušené sdílení */ return; }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setMsg(`${t('summary.odkazZkopirovan')}: ${url}`);
  };
  return (
    <div>
      <Button variant="ghost" className="w-full" onClick={share}><Share size={22} />{t('summary.sdilet')}</Button>
      {msg && <p role="status" data-testid="share-msg" className="mt-2 break-all text-[15px] text-ocel">{msg}</p>}
    </div>
  );
}
