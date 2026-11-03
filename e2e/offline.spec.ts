import { expect, test } from '@playwright/test';
import { doExercise, freshUser, loadSample, shot, stats, waitForSw } from './helpers';

test('B10: celý trénink v režimu letadlo, po připojení je každá série v DB právě jednou', async ({ page, context }) => {
  await freshUser(page);
  await page.goto('/');
  await waitForSw(page);
  await loadSample(page);
  await expect.poll(async () => (await stats(page)).planned_sets, { timeout: 30_000 }).toBe(22);
  await page.reload(); // stránku už řídí service worker
  await waitForSw(page);

  await context.setOffline(true);
  await page.goto('/'); // otevření appky bez signálu
  await expect(page.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await expect(page.getByText('Bez signálu')).toHaveCount(0); // obrazovka tréninku je bez rušivých hlášek
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
  expect(r).toBe('done');
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  await expect(page.getByText(/Bez signálu/)).toBeVisible();
  await shot(page, 1, '11-shrnuti-offline');

  await context.setOffline(false);
  await expect.poll(async () => stats(page), { timeout: 45_000 }).toMatchObject({ sets: 22, distinct_sets: 22, sessions: 1 });
  // Opakovaná synchronizace nic nezdvojí
  await page.reload();
  await page.waitForTimeout(2000);
  expect(await stats(page)).toMatchObject({ sets: 22, distinct_sets: 22 });
});
