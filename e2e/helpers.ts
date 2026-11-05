import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/** Každý test má vlastního uživatele (čistá data v DB i v prohlížeči). */
export async function freshUser(page: Page) {
  const id = crypto.randomUUID();
  await page.context().addCookies([{ name: 'liftit_dev_user', value: id, url: 'http://localhost:3100' }]);
  return id;
}

export async function shot(page: Page, phase: number, name: string) {
  const dir = `docs/screenshots/faze-${phase}`;
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/${name}.png` });
}

/** Ťuknutí na obrazovce tréninku: appka chvíli ignoruje dvojité ťuknutí, test počká jako člověk. */
export async function press(page: Page, loc: import('@playwright/test').Locator) {
  await page.waitForTimeout(470);
  await loc.click();
}

export async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vyzkoušet ukázkový Trénink A' }).click();
  await expect(page.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
}

/** Domov ukazuje jen první tři cviky; rozbalí celý seznam. */
export async function showAllExercises(page: Page) {
  await expect(page.getByRole('list', { name: 'Cviky dnešního tréninku' })).toBeVisible();
  const more = page.getByRole('button', { name: /^\+ \d+ dalších$/ });
  if (await more.count()) await more.click();
}

export async function waitForSw(page: Page) {
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker?.getRegistration();
    return !!r?.active;
  }, null, { timeout: 30_000 });
}

export async function stats(page: Page) {
  const res = await page.request.get('/api/dev/stats');
  return res.json();
}

/** Odcvičí aktuální cvik (jedno ťuknutí na sérii) až po další cvik (nebo shrnutí). */
export async function doExercise(page: Page) {
  for (;;) {
    const btn = page.getByTestId('log-set');
    await expect(btn).toBeVisible();
    const label = (await btn.textContent()) ?? '';
    await press(page, btn);
    if (label.includes('Hotovo, trénink je tvůj!')) return 'done';
    await expect(btn).not.toHaveText(label);
    if (label.includes('poslední série cviku')) return 'next';
  }
}

/** Vyplnění hned po načtení stránky může přepsat hydratace Reactu; zkusí to znovu, dokud hodnota nedrží. */
export async function fillStable(loc: import('@playwright/test').Locator, value: string) {
  await expect(async () => {
    await loc.fill(value);
    await expect(loc).toHaveValue(value, { timeout: 500 });
    await loc.page().waitForTimeout(150);
    await expect(loc).toHaveValue(value, { timeout: 500 });
  }).toPass({ timeout: 10_000 });
}
