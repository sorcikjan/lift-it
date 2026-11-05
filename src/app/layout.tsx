import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { t } from '@/i18n/t';
import { ClientBoot } from '@/components/ClientBoot';
import './globals.css';

const barlow = Barlow({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-barlow' });
const condensed = Barlow_Condensed({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700', '800'], variable: '--font-barlow-condensed' });

export const metadata: Metadata = {
  title: t('app.name'),
  description: t('app.description'),
  applicationName: t('app.name'),
  appleWebApp: { capable: true, title: t('app.name'), statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#111418',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${barlow.variable} ${condensed.variable}`}>
      <body className="min-h-dvh antialiased">
        <ClientBoot />
        {children}
      </body>
    </html>
  );
}
