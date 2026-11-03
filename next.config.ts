import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import { execSync } from 'node:child_process';

const revision = (() => {
  try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return String(Date.now()); }
})();

// Stránky appky se předem uloží do cache, aby trénink šel spustit i v režimu letadlo (B10).
const APP_PAGES = ['/', '/trenink', '/shrnuti', '/knihovna', '/knihovna/cvik', '/knihovna/novy', '/import', '/plan', '/ucet', '/progres', '/progres/cvik', '/progres/mereni', '/library/exercises.json'];

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: APP_PAGES.map((url) => ({ url, revision })),
  cacheOnNavigation: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@electric-sql/pglite'],
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
