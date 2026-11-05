'use client';
import { useState } from 'react';
import { t } from '@/i18n/t';

/** Obrázek začátku a konce pohybu (B3, C3). Bez obrázku jen tichý zástupný text. */
export function ExerciseImages({ images, name, tall }: { images: string[]; name: string; tall?: boolean }) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const shown = images.slice(0, 2);
  const h = tall ? 'h-[180px]' : 'h-[min(108px,12dvh)]';
  return (
    <div className="mt-4 rounded-[18px] bg-guma p-3">
      {shown.length && !shown.every((_, i) => failed[i]) ? (
        <div className={`flex gap-2 ${h}`}>
          {shown.map((src, i) => failed[i] ? null : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`${name}: ${i === 0 ? t('run.zacatek') : t('run.konec')}`} loading="lazy" decoding="async"
              onError={() => setFailed((f) => ({ ...f, [i]: true }))}
              className="h-full min-w-0 flex-1 rounded-xl bg-grafit object-cover" />
          ))}
        </div>
      ) : (
        <div className={`flex items-center justify-center text-[14px] text-ocel ${h}`}>{t('run.obrazekChybi')}</div>
      )}
      <p className="mt-1 flex justify-between text-[13px] text-ocel"><span>{t('run.zacatek')}</span><span>{t('run.konec')}</span></p>
    </div>
  );
}
