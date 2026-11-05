'use client';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Back } from './icons';
import { t } from '@/i18n/t';

type Variant = 'action' | 'done' | 'dark' | 'ghost' | 'light';
const VARIANTS: Record<Variant, string> = {
  action: 'bg-modra-akce text-krida',
  done: 'bg-splneno text-guma',
  dark: 'bg-guma text-krida',
  ghost: 'border border-linka text-ocel bg-transparent',
  light: 'bg-krida text-guma',
};

export function Button({ variant = 'action', big, className = '', ...p }: ComponentProps<'button'> & { variant?: Variant; big?: boolean }) {
  return (
    <button type="button" {...p}
      className={`tap inline-flex items-center justify-center gap-3 rounded-[20px] px-5 font-display font-bold disabled:opacity-50 ${big ? 'h-[84px] w-full text-[32px]' : 'h-14 text-[20px]'} ${VARIANTS[variant]} ${className}`} />
  );
}

export function LinkButton({ variant = 'action', big, className = '', ...p }: ComponentProps<typeof Link> & { variant?: Variant; big?: boolean }) {
  return (
    <Link {...p}
      className={`tap inline-flex items-center justify-center gap-3 rounded-[20px] px-5 font-display font-bold ${big ? 'h-[84px] w-full text-[32px]' : 'h-14 text-[20px]'} ${VARIANTS[variant]} ${className}`} />
  );
}

export function Page({ children, nav = true, className = '' }: { children: ReactNode; nav?: boolean; className?: string }) {
  return <main className={`mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 safe-top ${nav ? 'pb-28' : 'pb-6'} ${className}`}>{children}</main>;
}

export function PageTitle({ title, back, sub, right }: { title: string; back?: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-start gap-3 pb-4 pt-2">
      {back && (
        <Link href={back} aria-label={t('common.zpet')} className="tap -ml-2 flex items-center justify-center rounded-xl text-ocel">
          <Back size={28} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[40px] font-bold leading-none">{title}</h1>
        {sub && <div className="mt-1 text-[17px] text-ocel">{sub}</div>}
      </div>
      {right}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-hrana bg-grafit p-4 ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-semibold text-ocel">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'tap w-full rounded-2xl border border-linka bg-guma px-4 text-[18px] text-krida placeholder:text-ocel/70';

export function Toast({ children, tone = 'done' }: { children: ReactNode; tone?: 'done' | 'info' }) {
  return (
    <p role="status" className={`rounded-2xl px-4 py-3 text-[16px] font-semibold ${tone === 'done' ? 'bg-splneno text-guma' : 'bg-grafit text-krida'}`}>{children}</p>
  );
}
