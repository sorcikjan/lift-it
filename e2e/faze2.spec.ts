import { expect, test } from '@playwright/test';
import { doExercise, fillStable, freshUser, loadSample, press, shot, stats, showAllExercises } from './helpers';

const URL = 'https://docs.google.com/spreadsheets/d/mock-tyden-hlavicka/edit#gid=0';

async function importLink(page: import('@playwright/test').Page) {
  await page.goto('/import');
  await fillStable(page.getByRole('textbox', { name: 'Odkaz na Google Sheet' }), URL);
  await page.getByRole('button', { name: 'Načíst sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Náhled' })).toBeVisible();
}

async function finishWorkout(page: import('@playwright/test').Page) {
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
}

test('A1, A2, A5: import odkazem do 1 min, podruhé bez mapování, reimport nepřepíše odcvičené', async ({ page }) => {
  await freshUser(page);
  const t0 = Date.now();
  await importLink(page);
  // první import: hlavička poznaná, ukáže se náhled se 2 tréninky
  await expect(page.getByRole('region', { name: 'Trénink A' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Trénink B' })).toBeVisible();
  await shot(page, 2, '01-import-odkazem-nahled');
  while (await page.getByRole('button', { name: /^Myslíš / }).count()) await page.getByRole('button', { name: /^Myslíš / }).first().click();
  await page.getByRole('button', { name: 'Uložit týden' }).click();
  await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(60_000);

  // odcvičit trénink A
  await page.goto('/');
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await finishWorkout(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();

  // trenér změní sheet: A i B mají jinou váhu leg pressu / dřepu
  const changed = `Trénink,Cvik,Série,Opakování,Váha,Pauza,Poznámka
A,Leg press,4,10,60,90,
B,Dřep s osou,5,5,50,2:00,`;
  await page.request.post('/api/dev/mock-sheet', { data: { key: 'tyden-hlavicka', csv: changed } });

  await importLink(page);
  // podruhé bez mapování: mapování se nezobrazí rozbalené
  await expect(page.getByText('Stačí jednou. Příště si to appka pamatuje.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Uložit týden' }).click();
  await expect(page.getByText(/Aktualizováno 1 neodcvičených tréninků/)).toBeVisible();

  // odcvičený A beze změny (7 cviků, leg press 40 kg), B aktualizovaný (dřep 5 × 5, 50 kg)
  await page.goto('/');
  const weekButtons = page.getByRole('group', { name: /Hotové tréninky tento týden/ }).getByRole('button');
  await weekButtons.nth(1).click();
  await expect(page.getByRole('heading', { name: 'Trénink B' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Dřep s osou' })).toContainText('5 × 5');
  await expect(page.getByRole('listitem').filter({ hasText: 'Dřep s osou' })).toContainText('50 kg');
  await weekButtons.nth(0).click();
  await expect(page.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
  await showAllExercises(page);
  await expect(page.getByRole('listitem').filter({ hasText: 'Leg press' })).toContainText('40 kg');
  await expect(page.getByRole('list', { name: 'Cviky dnešního tréninku' }).getByRole('listitem')).toHaveCount(7);
});

test('D1, D2, E1: progres po dvou trénincích a sdílený odkaz bez přihlášení', async ({ page, browser }) => {
  await freshUser(page);
  await loadSample(page);
  for (let round = 0; round < 2; round++) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Začít trénink' }).click();
    await finishWorkout(page);
    await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  }
  // ve shrnutí druhého tréninku oprav leg press na 45 kg × 10
  const leg = page.getByRole('listitem').filter({ hasText: 'Leg press' }).first();
  await leg.getByRole('button', { name: /^40 × 10/ }).first().click();
  await page.getByRole('textbox', { name: 'Váha (kg)' }).fill('45');
  await page.getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByText('Nové osobní rekordy')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Předchozí 40 kg' })).toBeVisible();
  await shot(page, 2, '02-shrnuti-rekord');

  // E1: sdílet
  await page.getByRole('button', { name: 'Sdílet trenérovi' }).click();
  const msg = await page.getByTestId('share-msg').textContent();
  const url = msg!.match(/https?:\/\/\S+/)![0];
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await anon.newPage();
  await p2.goto(url);
  await expect(p2.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
  await expect(p2.getByText('Leg press')).toBeVisible();
  await expect(p2.getByText('45 × 10 · plán 40 × 10')).toBeVisible();
  await p2.screenshot({ path: 'docs/screenshots/faze-2/03-sdilene-shrnuti.png' });
  await anon.close();

  // D2: seznam progresu
  await page.goto('/progres');
  const row = page.getByRole('link', { name: /Leg press/ });
  await expect(row).toContainText('+');
  await shot(page, 2, '04-progres');
  await row.click();
  await expect(page.getByText('od začátku')).toBeVisible();
  await expect(page.getByText('Odhad maxima (1RM) v kg, jeden bod = jeden trénink')).toBeVisible();
  await shot(page, 2, '05-progres-detail');
  await page.getByRole('button', { name: 'Zobrazit jako tabulku' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect((await stats(page)).sets).toBe(44);
});
