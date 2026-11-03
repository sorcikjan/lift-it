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

/** Odcvičí aktuální cvik od karty Na řadě až po další kartu (nebo shrnutí). */
export async function doExercise(page: Page) {
  await press(page, page.getByRole('button', { name: 'Jdu na to' }).first());
  for (;;) {
    await expect(page.getByTestId('card-work')).toBeVisible();
    const label = (await page.getByTestId('log-set').textContent()) ?? '';
    await press(page, page.getByTestId('log-set'));
    if (label.includes('Hotovo, trénink je tvůj!')) return 'done';
    if (label.includes('Série i cvik hotový')) return 'next';
    await expect(page.getByTestId('card-rest')).toBeVisible();
    await press(page, page.getByRole('button', { name: 'Jdu na další sérii' }));
  }
}
