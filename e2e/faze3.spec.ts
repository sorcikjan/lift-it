import { expect, test, type Page } from '@playwright/test';
import { doExercise, fillStable, freshUser, loadSample, press, shot } from './helpers';

const SHEET = `Trénink,Cvik,Série,Opakování,Váha,Pauza
A,Dřep s osou,2,5,40,90
A,A1 Tlak na prsa,2,8,35,
A,A2 Přítahy horní kladky,2,10,35,
A,Plank,1,30 s,BW,`;
const URL = 'https://docs.google.com/spreadsheets/d/mock-faze3-a9/edit#gid=0';

async function finishWorkout(page: Page) {
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
}

test('Kotouče, B14, A9, G1–G4: superserie, zápis do sheetu a tep ze Stravy', async ({ page }) => {
  test.setTimeout(180_000);
  await freshUser(page);
  await page.request.post('/api/dev/mock-sheet', { data: { key: 'faze3-a9', csv: SHEET } });

  // G1: propojit Stravu (mock OAuth)
  await page.goto('/ucet');
  await page.getByRole('button', { name: 'Propojit Stravu' }).click();
  await expect(page.getByText('Strava je propojená')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Zapisovat odcvičené série do popisu aktivity' })).toBeChecked();
  await shot(page, 3, '01-ucet-strava');

  // import odkazem
  await page.goto('/import');
  await fillStable(page.getByRole('textbox', { name: 'Odkaz na Google Sheet' }), URL);
  await page.getByRole('button', { name: 'Načíst sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Náhled' })).toBeVisible();
  while (await page.getByRole('button', { name: /^Myslíš / }).count()) await page.getByRole('button', { name: /^Myslíš / }).first().click();
  await page.getByRole('button', { name: 'Uložit týden' }).click();
  await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();

  // B14: superserie v seznamu jako A1 / A2
  await page.goto('/');
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' })).toContainText('A1');
  await expect(page.getByRole('listitem').filter({ hasText: 'Přítahy horní kladky' })).toContainText('A2');
  await page.getByRole('button', { name: 'Začít trénink' }).click();

  // Kotouče: dřep 40 kg = osa + 10 kg na každou stranu
  const card = page.getByTestId('run-card');
  const btn = page.getByTestId('log-set');
  await expect(card.getByTestId('plates')).toHaveAttribute('aria-label', 'Na každou stranu: 10 kg, osa 20 kg');
  await shot(page, 3, '02-kotouce');
  await press(page, btn);
  await expect(card.getByText('Série 1 je doma.')).toBeVisible();
  await expect(card.getByTestId('plates')).toBeVisible();
  await press(page, btn);

  // B14: A1 → A2 bez pauzy, pauza až po dvojici
  await expect(card.getByText('Hlavní část · Superserie A')).toBeVisible();
  await expect(card).toContainText('Tlak na prsa');
  await expect(btn).toContainText('pak hned Přítahy horní kladky');
  await shot(page, 3, '03-superserie');
  await press(page, btn);
  await expect(card).toContainText('Přítahy horní kladky');
  await expect(card.getByText('Série 1 je doma.')).toHaveCount(0);
  await press(page, btn);
  await expect(card.getByText('Série 1 je doma.')).toBeVisible();
  await expect(card).toContainText('Tlak na prsa');
  await press(page, btn);
  await expect(card).toContainText('Přítahy horní kladky');
  await press(page, btn);
  await expect(card).toContainText('Plank');
  await finishWorkout(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();

  // G2, G3, G5: tep a kalorie se připojí samy
  const watch = page.getByTestId('watch');
  await expect(watch).toContainText('Spárováno s aktivitou ve Stravě');
  await expect(watch).toContainText('118');
  await expect(watch).toContainText('342');
  await watch.scrollIntoViewIfNeeded();
  await shot(page, 3, '04-shrnuti-hodinky');

  // G4: série v popisu aktivity, původní text z Garminu zůstal
  const { descriptions } = await (await page.request.get('/api/dev/mock-strava')).json();
  const desc = Object.values(descriptions as Record<string, string>).find((d) => d.includes('Dřep s osou 2 × 5, 40 kg'));
  expect(desc).toBeDefined();
  expect(desc).toMatch(/^Garmin Forerunner\n\nOdcvičeno v Lift It\n/);
  expect(desc).toContain('Tlak na prsa 2 × 8, 35 kg');
  expect(desc).toContain('Plank 1 × 30 s');

  // A9: zápis do trenérova sheetu
  await page.getByRole('button', { name: 'Zapsat do trenérova sheetu' }).click();
  await expect(page.getByText('Zapsáno do sheetu, sloupec G')).toBeVisible();
  await shot(page, 3, '05-zapis-do-sheetu');
  const { cells } = await (await page.request.get('/api/dev/mock-sheet?tab=faze3-a9')).json();
  expect(cells).toEqual(expect.arrayContaining([
    { row: 0, col: 6, value: 'Odcvičeno' },
    { row: 1, col: 6, value: '2 × 5, 40 kg' },
    { row: 2, col: 6, value: '2 × 8, 35 kg' },
    { row: 3, col: 6, value: '2 × 10, 35 kg' },
    { row: 4, col: 6, value: '1 × 30 s' },
  ]));
});

test('G3: hodinky ještě nesynchronizovaly → čekám na data, zkusit znovu', async ({ page }) => {
  await freshUser(page);
  await page.goto('/ucet');
  await page.getByRole('button', { name: 'Propojit Stravu' }).click();
  await expect(page.getByText('Strava je propojená')).toBeVisible();
  await page.request.post('/api/dev/mock-strava', { data: { empty: true } });
  try {
    await loadSample(page);
    await page.getByRole('button', { name: 'Začít trénink' }).click();
    await finishWorkout(page);
    await expect(page.getByTestId('watch')).toContainText('Čekám na data z hodinek');
    await page.request.post('/api/dev/mock-strava', { data: { empty: false } });
    await page.getByRole('button', { name: 'Zkusit znovu' }).click();
    await expect(page.getByTestId('watch')).toContainText('Spárováno s aktivitou ve Stravě');
  } finally {
    await page.request.post('/api/dev/mock-strava', { data: { empty: false } });
  }
});

test('A8, B15, D6: historie, cvik navíc a tělesná měření', async ({ page }) => {
  await freshUser(page);
  // A8: starší týden jako historie
  await page.goto('/import?historie=1');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill('Leg press\t4x10\t30');
  await page.getByRole('button', { name: 'Zpracovat' }).click();
  await page.getByLabel('Kdy se týden cvičil').fill('2026-09-07');
  await shot(page, 3, '06-historie-import');
  await page.getByRole('button', { name: 'Uložit jako historii' }).click();
  await expect(page.getByText('Hotovo')).toBeVisible();

  // historie se nenabízí jako dnešní trénink
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await finishWorkout(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();

  // B15: cvik navíc mimo plán
  await page.getByRole('button', { name: 'Přidat cvik navíc' }).click();
  await page.getByRole('searchbox', { name: 'Hledat cvik' }).fill('kliky');
  await page.getByRole('button', { name: 'Kliky · Pushups' }).click();
  await page.getByRole('textbox', { name: 'Opakování' }).fill('15');
  await page.getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByRole('button', { name: /15× · navíc/ })).toBeVisible();
  await shot(page, 3, '07-cvik-navic');

  // progres začíná historií: leg press 30 → 40 kg
  await page.goto('/progres');
  const leg = page.getByRole('link', { name: /Leg press/ });
  await expect(leg).toContainText('start 30 kg × 10');
  await expect(leg).toContainText('+33 %');

  // D6: měření
  await page.goto('/progres/mereni');
  await page.getByLabel('Datum').fill('2026-10-01');
  await page.getByLabel('Hmotnost (kg)').fill('84');
  await page.getByLabel('Pas (cm)').fill('92');
  await page.getByRole('button', { name: 'Uložit měření' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo' })).toBeVisible();
  await page.getByLabel('Datum').fill('2026-11-01');
  await page.getByLabel('Hmotnost (kg)').fill('82,5');
  await page.getByRole('button', { name: 'Uložit měření' }).click();
  const list = page.getByRole('list', { name: 'Tělesná měření' }).getByRole('listitem');
  await expect(list).toHaveCount(2);
  await expect(list.first()).toContainText('Hmotnost (kg) 82,5');
  await expect(page.getByRole('figure', { name: 'Hmotnost v kg' })).toBeVisible();
  await shot(page, 3, '08-mereni');
});
