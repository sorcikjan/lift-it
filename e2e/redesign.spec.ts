import { expect, test } from '@playwright/test';
import { doExercise, freshUser, loadSample, shot } from './helpers';

test('Vstup: nepřihlášený bez dat vidí claim a Google, bez účtu pustí dál', async ({ page }) => {
  await freshUser(page);
  await page.route('**/api/me', (r) => r.fulfill({ json: { user: null, auth: 'supabase' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Každodenní cvičení jednodušší.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pokračovat přes Google' })).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, 5, '00-vstup');
  await page.getByRole('button', { name: 'Zatím vyzkoušet bez účtu' }).click();
  await expect(page.getByRole('heading', { name: 'Zatím tu není žádný plán.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Zatím tu není žádný plán.' })).toBeVisible();
});

test('Profil: týden, souhrn a Strava', async ({ page }) => {
  await freshUser(page);
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  await page.goto('/ucet');
  await expect(page.getByRole('img', { name: 'Tento týden: 1 z 7 dní s tréninkem' })).toBeVisible();
  await expect(page.getByText('tréninků').locator('..')).toContainText('1');
  await expect(page.getByText('sérií', { exact: true }).locator('..')).toContainText('22');
  await expect(page.getByRole('heading', { name: 'Strava a hodinky' })).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, 5, '08-profil');
});
