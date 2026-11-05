import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { freshUser, shot, showAllExercises } from './helpers';

test('A7: vložená tabulka vytvoří trénink se správnými cviky, sériemi a váhami', async ({ page }) => {
  await freshUser(page);
  await page.goto('/import');
  const tsv = readFileSync('tests/fixtures/sheets/tyden-bloky.csv', 'utf8').replace(/,/g, '\t').replace(/"(\d+)\t(\d+)"/g, '$1,$2');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill(tsv);
  await page.getByRole('button', { name: 'Zpracovat' }).click();

  const rows = page.getByTestId('preview-row');
  await expect(rows).toHaveCount(12);
  // Nejisté názvy appka rozhodne sama (odhad nebo nový cvik); změnit jde, ale nemusí se nic
  await expect(page.getByText(/Odhad z knihovny|Uloží se jako nový cvik/).first()).toBeVisible();
  await shot(page, 1, '12-import-nahled');
  const save = page.getByRole('button', { name: 'Uložit týden' });
  await expect(save).toBeEnabled();
  // Ruční oprava jednoho odhadu se uloží jako alias
  const legpres = rows.filter({ hasText: 'Legpres' });
  await legpres.getByRole('button', { name: /Odhad z knihovny|Uloží se jako nový cvik/ }).click();
  await legpres.getByRole('button', { name: 'Vybrat jiný cvik' }).click();
  await page.getByRole('searchbox').or(page.getByRole('textbox', { name: /Hledat/ })).first().fill('Leg press');
  await page.getByRole('button', { name: /^Leg press/i }).first().click();
  await save.click();
  await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
  await showAllExercises(page);
  const leg = page.getByRole('listitem').filter({ hasText: 'Leg press' });
  await expect(leg).toContainText('4 × 10');
  await expect(leg).toContainText('40 kg');
  await expect(page.getByRole('listitem').filter({ hasText: 'Plank' })).toContainText('3 × 30 s');

  // Alias z potvrzení: příště se „Legpres“ spáruje sám
  await page.goto('/import');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill('Legpres\t4x10\t40');
  await page.getByRole('button', { name: 'Zpracovat' }).click();
  await expect(page.getByText(/Odhad z knihovny|Uloží se jako nový cvik/)).toHaveCount(0);
});

test('XLSX od trenéra: soubor z mailu dá celý trénink s úvodem a poznámkou', async ({ page }) => {
  await freshUser(page);
  await page.goto('/import');
  await page.getByLabel('Vybrat soubor').setInputFiles({ name: '1-Trénink 2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync('fixtures/trenink-2.xlsx') });

  const rows = page.getByTestId('preview-row');
  await expect(rows).toHaveCount(9);
  await expect(page.getByRole('heading', { name: /Trénink A/ })).toContainText('1-Trénink 2');
  await expect(rows.filter({ hasText: 'Pulldown' }).or(rows.filter({ hasText: 'pulldown' })).first()).toContainText('3 × 9–10 · 32,5 kg');
  await expect(rows.filter({ hasText: /Superserie/ })).toHaveCount(0); // A1/A2 = úvod
  await expect(page.getByText(/Nejasná buňka/)).toHaveCount(0);
  await shot(page, 4, '10-import-xlsx');

  // Bez jediného ťuknutí na párování jde rovnou uložit
  await page.getByRole('button', { name: 'Uložit týden' }).click();
  await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();
  await page.goto('/');
  await showAllExercises(page);
  for (const n of ['Seated Thoracic Rotation with Medicine Ball', 'Zakopávání na stroji', 'Shoulder press DB', 'Plank']) {
    await expect(page.getByRole('listitem').filter({ hasText: n })).toBeVisible();
  }
});
