import { expect, test } from '@playwright/test';
import { freshUser, loadSample } from './helpers';

test('B8: displej drží po celý trénink a zámek se znovu vyžádá po návratu do appky', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __wl: { requests: number; sentinel: EventTarget & { released: boolean; release(): Promise<void> } | null } };
    w.__wl = { requests: 0, sentinel: null };
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: async () => {
          w.__wl.requests++;
          const s = Object.assign(new EventTarget(), { released: false, release: async () => { s.released = true; s.dispatchEvent(new Event('release')); } });
          w.__wl.sentinel = s;
          return s;
        },
      },
    });
  });
  await freshUser(page);
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await expect(page.getByTestId('wake')).toHaveAttribute('data-held', 'true');
  await expect(page.getByRole('img', { name: 'Displej zůstane rozsvícený' })).toBeVisible();

  // iOS uvolní zámek při odchodu z appky
  await page.evaluate(() => (window as unknown as { __wl: { sentinel: { release(): Promise<void> } } }).__wl.sentinel.release());
  await expect(page.getByTestId('wake')).toHaveAttribute('data-held', 'false');
  // návrat do appky
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('wake')).toHaveAttribute('data-held', 'true');
  expect(await page.evaluate(() => (window as unknown as { __wl: { requests: number } }).__wl.requests)).toBeGreaterThanOrEqual(2);

  // Safari zámek tiše pustí i bez odchodu z appky: první ťuknutí na obrazovku si ho vyžádá znovu
  await page.evaluate(() => (window as unknown as { __wl: { sentinel: { release(): Promise<void> } } }).__wl.sentinel.release());
  await expect(page.getByTestId('wake')).toHaveAttribute('data-held', 'false');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.getByTestId('wake')).toHaveAttribute('data-held', 'true');
  await expect(page.getByText('Displej svítí')).toBeVisible();
});
