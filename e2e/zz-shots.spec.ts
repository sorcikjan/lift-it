import { test } from '@playwright/test';
import { freshUser, loadSample, press } from './helpers';
test('shots', async ({ page }) => {
  await freshUser(page); await loadSample(page);
  await page.screenshot({ path: '/private/tmp/claude-502/-Users-jsorcik-projects-nhl-momentum/0d408b78-be8b-472e-9cb1-869d2231fe3d/scratchpad/rd/home.png', fullPage: true });
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await page.waitForTimeout(1200); await page.screenshot({ path: '/private/tmp/claude-502/-Users-jsorcik-projects-nhl-momentum/0d408b78-be8b-472e-9cb1-869d2231fe3d/scratchpad/rd/run1.png' });
  await press(page, page.getByTestId('log-set')); await page.waitForTimeout(120); await page.screenshot({ path: '/private/tmp/claude-502/-Users-jsorcik-projects-nhl-momentum/0d408b78-be8b-472e-9cb1-869d2231fe3d/scratchpad/rd/run-burst.png' });
  await page.waitForTimeout(1000); await page.screenshot({ path: '/private/tmp/claude-502/-Users-jsorcik-projects-nhl-momentum/0d408b78-be8b-472e-9cb1-869d2231fe3d/scratchpad/rd/run-rest.png' });
  for (let i = 0; i < 5; i++) await press(page, page.getByTestId('log-set'));
  await page.waitForTimeout(1200); await page.screenshot({ path: '/private/tmp/claude-502/-Users-jsorcik-projects-nhl-momentum/0d408b78-be8b-472e-9cb1-869d2231fe3d/scratchpad/rd/run-main.png' });
});
