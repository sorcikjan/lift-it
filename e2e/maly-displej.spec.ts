import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { freshUser } from './helpers';

// iPhone SE a appka z plochy na iPhonu 13 (bez horní lišty a spodního proužku)
for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 763 }]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('trenérův trénink: tlačítko série je celé vidět, nic ho nepřekrývá a hlavička se nezalomí', async ({ page }) => {
      await freshUser(page);
      await page.goto('/import');
      await page.getByLabel('Vybrat soubor').setInputFiles({ name: '1-Trénink 2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync('fixtures/trenink-2.xlsx') });
      await page.getByRole('button', { name: 'Uložit týden' }).click();
      await expect(page.getByText('Týden je uložený. Jdeme cvičit?')).toBeVisible();
      await page.goto('/');
      await page.getByRole('button', { name: 'Začít trénink' }).click();

      // Hlavní tlačítko série: celé vidět (po doscrollování ke kartě) a na jeho středu je opravdu ono
      for (let k = 0; k < 4; k++) {
        const cta = page.getByTestId('log-set');
        const label = (await cta.textContent()) ?? '';
        await cta.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await expect(cta).toBeInViewport({ ratio: 1 });
        const b = (await cta.boundingBox())!;
        const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('data-testid') ?? '', [b.x + b.width / 2, b.y + b.height / 2]);
        expect(hit).toBe('log-set');
        // hlavička tréninku se nezalomí přes sebe
        const h = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
        expect(h.height).toBeLessThan(44);
        await page.waitForTimeout(470);
        await cta.click();
        await expect(cta).not.toHaveText(label);
      }
    });
  });
}
