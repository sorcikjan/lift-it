import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { freshUser, shot } from './helpers';

test('A7: vložená tabulka vytvoří trénink se správnými cviky, sériemi a váhami', async ({ page }) => {
  await freshUser(page);
  await page.goto('/import');
  const tsv = readFileSync('tests/fixtures/sheets/tyden-bloky.csv', 'utf8').replace(/,/g, '\t').replace(/"(\d+)\t(\d+)"/g, '$1,$2');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill(tsv);
  await page.getByRole('button', { name: 'Zpracovat' }).click();

  const rows = page.getByTestId('preview-row');
  await expect(rows).toHaveCount(12);
  // Překlep „Legpres“ a „Brišáky“ nejsou jisté: nabídne návrh jedním ťuknutím
  await expect(page.getByText('Neznámý cvik').first()).toBeVisible();
  await shot(page, 1, '12-import-nahled');
  const save = page.getByRole('button', { name: 'Uložit týden' });
  await expect(save).toBeDisabled();
  while (await page.getByRole('button', { name: /^Myslíš / }).count()) {
    await page.getByRole('button', { name: /^Myslíš / }).first().click();
  }
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trénink A' })).toBeVisible();
  const leg = page.getByRole('listitem').filter({ hasText: 'Leg press' });
  await expect(leg).toContainText('4 × 10');
  await expect(leg).toContainText('40 kg');
  await expect(page.getByRole('listitem').filter({ hasText: 'Plank' })).toContainText('3 × 30 s');

  // Alias z potvrzení: příště se „Legpres“ spáruje sám
  await page.goto('/import');
  await page.getByRole('textbox', { name: 'Vložit zkopírovanou tabulku' }).fill('Legpres\t4x10\t40');
  await page.getByRole('button', { name: 'Zpracovat' }).click();
  await expect(page.getByText('Neznámý cvik')).toHaveCount(0);
});

test('XLSX od trenéra: soubor z mailu dá celý trénink se superserií a poznámkou', async ({ page }) => {
  await freshUser(page);
  await page.goto('/import');
  await page.getByLabel('Vybrat soubor').setInputFiles({ name: '1-Trénink 2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync('fixtures/trenink-2.xlsx') });

  const rows = page.getByTestId('preview-row');
  await expect(rows).toHaveCount(9);
  await expect(page.getByRole('heading', { name: /Trénink A/ })).toContainText('1-Trénink 2');
  await expect(rows.filter({ hasText: 'Pulldown' }).or(rows.filter({ hasText: 'pulldown' })).first()).toContainText('3 × 9–10 · 32,5 kg');
  await expect(rows.filter({ hasText: /Superserie A/ })).toHaveCount(2);
  await expect(page.getByText(/Nejasná buňka/)).toHaveCount(0);
  await shot(page, 4, '10-import-xlsx');
});
