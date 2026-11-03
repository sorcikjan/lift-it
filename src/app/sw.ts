/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  precacheOptions: { ignoreURLParametersMatching: [/.*/] },
  runtimeCaching: [
    {
      // Obrázky cviků z free-exercise-db: jednou stažené, pak offline
      matcher: ({ url }) => url.hostname === 'raw.githubusercontent.com',
      handler: new CacheFirst({
        cacheName: 'exercise-images',
        plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    ...defaultCache,
  ],
});

// Web push (E6): upozornění na nový plán a komentář
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Lift It', {
      body: data.body ?? '',
      icon: '/icons/192',
      badge: '/icons/192',
      data: { url: data.url ?? '/' },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});

serwist.addEventListeners();
