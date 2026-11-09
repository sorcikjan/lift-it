'use client';
import { updateSession } from '@/client/repo';
import { t } from '@/i18n/t';

/** Trénink s trenérem: přepínač Zaplaceno / Nezaplaceno. Trenér vidí potvrzení u klienta. */
export function PaidToggle({ id, paid, day, className = 'mr-2' }: { id: string; paid: boolean; day: string; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={paid} aria-label={t('sTrenerem.zaplacenoAria', { day })} data-testid="paid"
      onClick={() => updateSession(id, { paid: !paid })}
      className={`tap ${className} whitespace-nowrap rounded-full px-3 text-[14px] font-semibold ${paid ? 'bg-splneno/15 text-splneno-svetla' : 'bg-zluta/15 text-zluta'}`}>
      {paid ? `✓ ${t('sTrenerem.zaplaceno')}` : t('sTrenerem.nezaplaceno')}
    </button>
  );
}
