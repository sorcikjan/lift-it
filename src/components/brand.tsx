'use client';
import Link from 'next/link';
import { t } from '@/i18n/t';

/** Značka: zelená tečka (hotovo) + název. */
export function Brand() {
  return (
    <span className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[.4px]">
      <i className="inline-block h-3 w-3 rounded-full bg-splneno shadow-[0_0_12px_#34C77B66]" aria-hidden="true" />
      {t('app.name')}
    </span>
  );
}

export const initials = (name: string | null | undefined) =>
  (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '';

/** Kulatý avatar s iniciálami (přechod modrá → zelená). */
export function Avatar({ name, size = 42, href }: { name: string | null | undefined; size?: number; href?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  const inner = initials(name) || (
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
  const cls = 'flex flex-none items-center justify-center rounded-full bg-gradient-to-br from-modra-akce to-splneno font-display font-extrabold text-white shadow-[0_0_0_3px_var(--color-guma),0_0_0_4px_var(--color-linka)]';
  return href
    ? <Link href={href} aria-label={t('auth.ucet')} className={`press ${cls}`} style={style}>{inner}</Link>
    : <span className={cls} style={style} aria-hidden="true">{inner}</span>;
}

export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
