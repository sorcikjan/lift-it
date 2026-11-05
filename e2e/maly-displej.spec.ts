import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { freshUser } from './helpers';

// iPhone SE a appka z plochy na iPhonu 13 (bez horní lišty a spodního proužku)
for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 763 }]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('trenérův trénink: hlavní tlačítko je v každém stavu celé vidět a nic ho nepřekrývá', async ({ page }) => {
      await freshUser(page);
      await page.goto('/import');
      await page.getByLabel('Vybrat soubor').setInputFiles({ name: '1-Trénink 2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync('fixtures/trenink-2.xlsx') });
      await page.getByRole('button', { name: 'Uložit týden' }).click();
      await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();
      await page.goto('/');
      await page.getByRole('button', { name: 'Začít trénink' }).click();

      for (const name of [/Jdu na to/, /Série hotová/, /Série hotová/, /Jdu na další sérii/]) {
        const cta = page.getByRole('button', { name });
        await expect(cta).toBeInViewport({ ratio: 1 });
        // Tlačítko leží celé uvnitř karty (žádný obsah přes něj nepřetéká)
        const [b, card] = await Promise.all([cta.boundingBox(), page.locator('article').first().boundingBox()]);
        expect(b!.y + b!.height).toBeLessThanOrEqual(card!.y + card!.height);
        // Uprostřed tlačítka je opravdu tlačítko, ne jiný prvek
        const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.textContent ?? '', [b!.x + b!.width / 2, b!.y + b!.height / 2]);
        expect(hit).toMatch(name);
        await cta.click();
        await page.waitForTimeout(500);
      }
    });
  });
}
