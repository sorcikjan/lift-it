'use client';
import { useEffect, useState } from 'react';
import { writeBack, writebackTarget } from '@/client/writeback';
import { signInWithGoogle } from '@/client/supabase';
import { Button, Toast } from './ui';
import { t } from '@/i18n/t';

/** A9: zapsat odcvičené hodnoty zpět do trenérova sheetu jedním ťuknutím. */
export function WritebackButton({ sessionId }: { sessionId: string }) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'done' | 'info'; login?: boolean } | null>(null);
  useEffect(() => { void writebackTarget(sessionId).then((x) => setAvailable(!!x)); }, [sessionId]);
  if (!available) return null;

  const run = async () => {
    setBusy(true);
    const r = await writeBack(sessionId);
    setBusy(false);
    if (r.ok) setMsg({ text: t('zapis.hotovo', { col: r.column ?? '' }), tone: 'done' });
    else if (r.error === 'read_only' || r.error === 'google_login' || r.error === 'forbidden') setMsg({ text: t('zapis.pravo'), tone: 'info', login: true });
    else if (r.error === 'offline') setMsg({ text: t('zapis.offline'), tone: 'info' });
    else if (r.error === 'not_found') setMsg({ text: t('zapis.nenalezeno'), tone: 'info' });
    else setMsg({ text: t('zapis.chyba'), tone: 'info' });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="ghost" onClick={run} disabled={busy}>{t('zapis.tlacitko')}</Button>
      {msg && <Toast tone={msg.tone}>{msg.text}</Toast>}
      {msg?.login && <Button variant="light" onClick={() => signInWithGoogle(`/shrnuti?id=${sessionId}`, { write: true })}>{t('zapis.povolit')}</Button>}
    </div>
  );
}
