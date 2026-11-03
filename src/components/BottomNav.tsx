'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { t } from '@/i18n/t';
import { Book, Chart, Dumbbell, Users } from './icons';
import { onMe, type Me } from '@/client/me';

/** Dolní lišta: jen tři obrazovky (Trénink, Progres, Knihovna); trenér má navíc Klienty. */
export function BottomNav() {
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { const off = onMe((m) => setMe(m)); return () => { off(); }; }, []);
  const items = [
    { href: '/', label: t('nav.trenink'), icon: Dumbbell, active: path === '/' || path.startsWith('/shrnuti') || path.startsWith('/import') || path.startsWith('/plan') },
    { href: '/progres', label: t('nav.progres'), icon: Chart, active: path.startsWith('/progres') },
    { href: '/knihovna', label: t('nav.knihovna'), icon: Book, active: path.startsWith('/knihovna') },
    ...(me?.roles?.includes('coach') ? [{ href: '/trener', label: t('nav.trener'), icon: Users, active: path.startsWith('/trener') }] : []),
  ];
  return (
    <nav aria-label={t('nav.hlavni')} className="fixed inset-x-0 bottom-0 z-20 border-t border-linka bg-guma/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-[480px] justify-around px-2 pt-1">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1">
            <Link href={href} aria-current={active ? 'page' : undefined}
              className={`tap flex flex-col items-center justify-center gap-0.5 rounded-xl text-[13px] font-semibold ${active ? 'text-krida' : 'text-ocel'}`}>
              <Icon size={24} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
