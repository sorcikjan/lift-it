import type { MetadataRoute } from 'next';
import { t } from '@/i18n/t';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t('app.name'),
    short_name: t('app.name'),
    description: t('app.description'),
    lang: 'cs',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1C2024',
    theme_color: '#1C2024',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
