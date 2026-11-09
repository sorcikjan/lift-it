import { expect, test, type Page } from '@playwright/test';
import { freshUser, shot } from './helpers';

async function pulled(page: Page) {
  return (await page.request.get('/api/pull')).json();
}

test('Trénink s trenérem: nabídka ze Stravy, zaplaceno, ruční zápis a potvrzení u trenéra', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await freshUser(page);
  await page.goto('/ucet');
  await page.getByRole('button', { name: 'Propojit Stravu' }).click();
  await expect(page.getByText('Strava je propojená')).toBeVisible();

  // Aktivita ve Stravě bez tréninku v appce → otázka na domově
  await page.goto('/');
  const prompt = page.getByTestId('coach-prompt');
  await expect(prompt).toContainText('Byl to trénink s trenérem?');
  await expect(prompt).toContainText('50 min · tep 118');
  await shot(page, 5, '09-s-trenerem-nabidka');
  await prompt.getByRole('button', { name: 'Ano, zapsat' }).click();

  await expect(page.getByRole('heading', { name: 'Trénink s trenérem' })).toBeVisible();
  await expect(page.getByText('50 min')).toBeVisible();
  const paid = page.getByRole('switch', { name: /^Zaplaceno:/ });
  await expect(paid).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('watch')).toContainText('Spárováno s aktivitou ve Stravě');
  await shot(page, 5, '10-s-trenerem-shrnuti');

  // Profil: v seznamu tréninků, nahoře nezaplaceno
  await page.goto('/ucet');
  await expect(page.getByTestId('history-row').first()).toContainText('Trénink s trenérem');
  await expect(page.getByTestId('unpaid')).toContainText('Nezaplaceno:');
  await expect(page.getByRole('img', { name: /Tento týden: [01] z 7/ })).toBeVisible();

  // Ruční zápis bez hodinek
  await page.getByRole('button', { name: '+ Trénink s trenérem' }).click();
  await page.getByLabel('Den tréninku').fill('2026-11-02');
  await page.getByRole('button', { name: 'Zapsat' }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(2);
  await expect(page.getByTestId('unpaid')).toContainText('2. 11.');
  await shot(page, 5, '11-s-trenerem-profil');

  // Zaplatit oba
  for (const sw of await page.getByTestId('paid').all()) await sw.click();
  await expect(page.getByTestId('unpaid')).toHaveCount(0);
  await expect(page.getByTestId('paid').first()).toHaveText('✓ Zaplaceno');

  // Domov už se znovu neptá
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Zatím tu není žádný plán.' })).toBeVisible();
  await expect(page.getByTestId('coach-prompt')).toHaveCount(0);
  await expect.poll(async () => (await pulled(page)).sessions.filter((s: { paid: boolean }) => s.paid).length, { timeout: 30_000 }).toBe(2);

  // Trenér vidí potvrzení
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  const coach = await ctx.newPage();
  await freshUser(coach);
  await coach.goto('/trener');
  await coach.getByRole('button', { name: 'Jsem trenér' }).click();
  await coach.getByRole('button', { name: 'Pozvat klienta' }).click();
  const invite = (await coach.getByTestId('invite-url').textContent())!;
  await page.goto(invite);
  await page.getByRole('button', { name: 'Přijmout pozvánku' }).click();
  await expect(page.getByText('Hotovo, teď spolu trénujete.')).toBeVisible();
  await coach.goto('/trener');
  await coach.getByRole('list', { name: 'Klienti' }).getByRole('link').first().click();
  await expect(coach.getByTestId('coach-paid')).toHaveCount(2);
  await expect(coach.getByTestId('coach-paid').first()).toHaveText('✓ Zaplaceno, klient potvrdil');
  await expect(coach.getByTestId('coach-session').first()).toContainText('Trénink s trenérem');
  await ctx.close();
});
