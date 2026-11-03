'use client';
import { PLATE_COLORS, platesPerSide } from '@/domain/plates';
import { fmtKg } from '@/domain/format';
import { t } from '@/i18n/t';

/** Kotouče na každou stranu osy, barevně podle soutěžních kotoučů. */
export function Plates({ kg, className = '' }: { kg: number | null; className?: string }) {
  if (kg == null) return null;
  const r = platesPerSide(kg);
  if (!r) return null;
  const label = r.perSide.length
    ? `${t('plates.nadpis')}: ${r.perSide.map((p) => fmtKg(p)).join(', ')} kg, ${t('plates.osa', { w: fmtKg(r.bar) })}`
    : t('plates.jenOsa');
  return (
    <p data-testid="plates" aria-label={label} className={`flex items-center gap-1.5 text-[15px] font-semibold ${className}`}>
      {r.perSide.length ? (
        <>
          <span aria-hidden className="mr-1">{t('plates.nadpis')}</span>
          {r.perSide.map((p, i) => {
            const c = PLATE_COLORS[p];
            return (
              <span key={i} aria-hidden className="flex w-8 items-center justify-center rounded-md font-display text-[15px] font-bold tabular ring-1 ring-black/30"
                style={{ background: c.bg, color: c.fg, height: Math.round(c.h * 0.55) }}>{fmtKg(p)}</span>
            );
          })}
        </>
      ) : <span aria-hidden>{t('plates.jenOsa')}</span>}
    </p>
  );
}
