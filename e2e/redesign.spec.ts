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

test('Smazat trénink: zkušební trénink zmizí z profilu i z týdne', async ({ page }) => {
  await freshUser(page);
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  await page.goto('/ucet');
  const row = page.getByTestId('history-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Trénink A');
  await expect(row).toContainText('22 sérií');
  await row.click();
  const del = page.getByTestId('delete-session');
  await del.click();
  await expect(del).toHaveText('Opravdu smazat? Zmizí i z Progresu');
  await del.click();
  await expect(page).toHaveURL(/\/ucet/);
  await expect(page.getByRole('img', { name: 'Tento týden: 0 z 7 dní s tréninkem' })).toBeVisible();
  await expect(page.getByTestId('history-row')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Začít trénink' })).toBeVisible();
  await expect(page.getByText(/^0 ze \d+ tréninků/)).toBeVisible();
});

test('Oproti minule: domov ukáže přidané kilo u cviků, profil směr síly', async ({ page }) => {
  await freshUser(page);
  for (const [date, rows] of [['2026-10-26', 'Tlak na prsa\t3x8\t30\nLeg press\t4x10\t35'], ['2026-11-02', 'Tlak na prsa\t3x8\t32,5\nLeg press\t4x10\t37,5']]) {
    await page.goto('/import?historie=1');
    await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill(rows);
    await page.getByRole('button', { name: 'Zpracovat' }).click();
    await page.getByLabel('Kdy se týden cvičil').fill(date);
    await page.getByRole('button', { name: 'Uložit jako historii' }).click();
    await expect(page.getByText('Hotovo')).toBeVisible();
  }
  await loadSample(page);
  await expect(page.getByTestId('vs-last')).toHaveText('Oproti minulému tréninku: přidáno: 2');
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' }).getByTestId('delta')).toHaveText('+2,5 kg · minule 32,5 kg × 8');
  await expect(page.getByRole('listitem').filter({ hasText: 'Leg press' }).getByTestId('delta')).toHaveText('+2,5 kg · minule 37,5 kg × 10');
  await shot(page, 5, '12-oproti-minule');
  await page.goto('/ucet');
  const trend = page.getByTestId('trend');
  await expect(trend).toContainText('Síla +');
  await expect(trend).toContainText('od 26. 10.');
  await expect(trend).toContainText('Roste 2 z 2 cviků');
  await page.waitForTimeout(1000);
  await shot(page, 5, '13-smer');
});

test('Oproti minulému týdnu: nový týden od trenéra ukáže přidané váhy, opakování a nový cvik', async ({ page }) => {
  await freshUser(page);
  const monday = (d: Date) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return m.toLocaleDateString('sv-SE'); };
  const thisWeek = monday(new Date());
  const lastWeek = monday(new Date(Date.now() - 7 * 86400_000));
  for (const [date, rows] of [[lastWeek, 'Tlak na prsa\t3x8\t32,5\nLeg press\t4x10\t40'], [thisWeek, 'Tlak na prsa\t3x8\t35\nLeg press\t4x12\t40\nVeslování na kladce\t3x12\t30']]) {
    await page.goto('/import');
    await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill(rows);
    await page.getByRole('button', { name: 'Zpracovat' }).click();
    await page.getByLabel('Týden od').fill(date);
    await page.getByRole('button', { name: 'Uložit týden' }).click();
    await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();
  }
  await page.goto('/');
  await expect(page.getByTestId('vs-last')).toHaveText('Oproti minulému týdnu: přidáno: 2 · nové: 1');
  const row = (name: string) => page.getByRole('listitem').filter({ hasText: name }).getByTestId('delta');
  await expect(row('Tlak na prsa')).toHaveText('+2,5 kg · minule 32,5 kg × 8');
  await expect(row('Leg press')).toHaveText('+2 opak. · minule 40 kg × 10');
  await expect(row('Veslování na kladce')).toHaveText('Nový cvik');
  await shot(page, 5, '14-oproti-tydnu');
});
