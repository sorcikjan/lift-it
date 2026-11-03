'use client';
import { useEffect, useState } from 'react';
import { onSyncStatus, type SyncStatus } from '@/client/sync';
import { t } from '@/i18n/t';
import { Cloud, CloudOff } from './icons';

/** Malý stav synchronizace: bez signálu / čeká N / vše uložené. */
export function SyncBadge() {
  const [s, setS] = useState<SyncStatus | null>(null);
  useEffect(() => { const off = onSyncStatus(setS); return () => { off(); }; }, []);
  if (!s) return null;
  if (!s.online) return <span role="status" className="flex items-center gap-1.5 text-[14px] text-zluta"><CloudOff size={18} />{t('app.offline')}</span>;
  if (s.pending) return <span role="status" className="flex items-center gap-1.5 text-[14px] text-ocel"><Cloud size={18} />{t('app.syncPending', { n: s.pending })}</span>;
  return <span role="status" className="sr-only">{t('app.synced')}</span>;
}
