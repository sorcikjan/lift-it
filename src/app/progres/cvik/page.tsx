'use client';
import { BottomNav } from '@/components/BottomNav';
import { Page, PageTitle } from '@/components/ui';
import { t } from '@/i18n/t';

export default function ProgressPlaceholder() {
  return <Page><PageTitle title={t('progres.nadpis')} /><p className="text-ocel">{t('progres.zadnaData')}</p><BottomNav /></Page>;
}
