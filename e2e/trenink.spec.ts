import { expect, test } from '@playwright/test';
import { doExercise, freshUser, loadSample, press, shot, stats } from './helpers';

test.beforeEach(async ({ page }) => { await freshUser(page); });

test('B1–B6: celý trénink jedním ťuknutím na sérii → pauza → další cvik → shrnutí', async ({ page }) => {
  await loadSample(page);
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' })).toContainText('3 × 8');
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' })).toContainText('35 kg');
  await shot(page, 5, '01-domov');

  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await expect(page.getByText('Převlečený? Tak jdeme na to!')).toBeVisible();
  const card = page.getByTestId('run-card');
  const btn = page.getByTestId('log-set');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Tlak na prsa');
  await expect(card.getByText('Úvod jede podle plánu. Nachystej si stroj a jdeme.')).toBeVisible();
  await expect(card.getByText('na 35 kg')).toBeVisible();
  await expect(card.getByText('Poprvé · dej si na čas')).toBeVisible();
  await expect(card.locator('[data-figure="bp"]')).toBeVisible();
  await expect(btn).toHaveText(/Série 1 hotová.*zbývá ještě 2 série/);
  await shot(page, 5, '02-trenink-start');

  // 1 ťuknutí = zalogovaná série → pauza na stejné kartě
  await press(page, btn);
  await expect(card.getByText('Série 1 je doma.')).toBeVisible();
  await expect(card.getByText('Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál.')).toBeVisible();
  await expect(card.getByText('Ještě tahle a jedna. Jde ti to.')).toBeVisible();
  await expect(btn).toHaveText(/Série 2 hotová/);
  await expect(page.getByText('1/22')).toBeVisible();
  await shot(page, 5, '03-pauza');

  await press(page, btn);
  await expect(btn).toHaveText(/Série 3 hotová.*poslední série cviku/);
  await expect(card.getByText('Poslední série. Dotáhni to!')).toBeVisible();
  await press(page, btn);

  // Po poslední sérii žádná pauza: rovnou další cvik s pochvalou, hotový cvik nahoře odškrtnutý
  await expect(page.getByText('Tlak na prsa máš v kapse!')).toBeVisible();
  await expect(card).toContainText('Přítahy horní kladky');
  await expect(card.getByText('Série 1 je doma.')).toHaveCount(0);
  await expect(page.locator('[data-testid="run-row"][data-done="true"]')).toContainText('Tlak na prsa');
  await shot(page, 5, '04-dalsi-cvik');

  for (let i = 0; i < 5; i++) expect(await doExercise(page)).toBe('next');
  await expect(page.getByText('Závěr, už jen kousek. Ty to dáš.')).toBeVisible();
  await press(page, btn);
  await expect(btn).toHaveText(/Série 2 hotová/);
  await press(page, btn);
  await expect(page.getByText('Poslední série celého tréninku. Dej do toho všechno!')).toBeVisible();
  await expect(btn).toHaveText(/Hotovo, trénink je tvůj!/);
  await shot(page, 5, '05-posledni-serie-treninku');
  await press(page, btn);

  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  await expect(page.getByText('z 22')).toBeVisible();
  await page.waitForTimeout(1600);
  await shot(page, 5, '06-shrnuti');

  await expect.poll(async () => (await stats(page)).sets, { timeout: 30_000 }).toBe(22);
});

test('B7: obsazený stroj — jiný cvik jde vybrat jen v hlavní části, přeskočený jde hned potom', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  // úvod: nic jiného vybrat nejde
  await expect(page.getByRole('button', { name: /^Cvičit teď/ })).toHaveCount(0);
  await doExercise(page);
  await expect(page.getByRole('button', { name: /^Cvičit teď/ })).toHaveCount(0);
  await doExercise(page);

  // hlavní část: Leg press na řadě, další tři cviky hlavní části jdou vybrat (závěr ne)
  const card = page.getByTestId('run-card');
  await expect(card).toContainText('Leg press');
  await expect(card.getByText('Obsazeno? Ťukni níž na jiný cvik, k tomuhle se vrátíme.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Cvičit teď/ })).toHaveCount(3);
  await page.getByRole('button', { name: 'Cvičit teď Veslování na kladce' }).click();
  await expect(card).toContainText('Veslování na kladce');
  await expect(card).toContainText('Nebo tohle');
  await expect(card.getByText('Leg press počká, vrátíme se k němu hned potom.')).toBeVisible();
  await shot(page, 5, '07-vybrany-jiny-cvik');

  await press(page, page.getByTestId('log-set'));
  await expect(card).toContainText('Veslování na kladce');
  await expect(page.getByTestId('run-row').nth(2)).toContainText('Leg press');
  await doExercise(page);
  await expect(card).toContainText('Leg press');
  await expect(card).toContainText('Vracíme se');
});

test('B9: zavření appky a znovuotevření vrátí stejný cvik ve stejném stavu', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await press(page, page.getByTestId('log-set'));
  await expect(page.getByText('Série 1 je doma.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Série 1 je doma.')).toBeVisible();
  await expect(page.getByTestId('log-set')).toHaveText(/Série 2 hotová/);

  await page.goto('/');
  await page.getByRole('button', { name: 'Pokračovat v tréninku' }).click();
  await expect(page.getByTestId('log-set')).toHaveText(/Série 2 hotová/);
});

test('Zpět místo dialogu vrátí omylem zalogovanou sérii', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await press(page, page.getByTestId('log-set'));
  await expect(page.getByText('Série 1 je doma.')).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Zpět' }));
  await expect(page.getByTestId('log-set')).toHaveText(/Série 1 hotová/);
  await expect(page.getByText('Série 1 je doma.')).toHaveCount(0);
});

test('Minule: karta ukáže, co jsem zvedl minule, a o kolik je dnešní plán víc', async ({ page }) => {
  await page.goto('/import?historie=1');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill('Tlak na prsa\t3x8\t30');
  await page.getByRole('button', { name: 'Zpracovat' }).click();
  await page.getByLabel('Kdy se týden cvičil').fill('2026-09-07');
  await page.getByRole('button', { name: 'Uložit jako historii' }).click();
  await expect(page.getByText('Hotovo')).toBeVisible();

  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await expect(page.getByTestId('last')).toHaveText(/Minule\s*30 kg × 8\s*dnes \+5 kg/);
});
