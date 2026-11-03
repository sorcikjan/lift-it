import { expect, test } from '@playwright/test';
import { doExercise, freshUser, loadSample, press, shot, stats } from './helpers';

test.beforeEach(async ({ page }) => { await freshUser(page); });

test('B1–B6: celá smyčka Na řadě → Cvičím → Vydýchej se → další karta → shrnutí', async ({ page }) => {
  await loadSample(page);
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' })).toContainText('3 × 8');
  await expect(page.getByRole('listitem').filter({ hasText: 'Tlak na prsa' })).toContainText('35 kg');
  await shot(page, 1, '01-domov');

  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await expect(page.getByText('Převlečený? Tak jdeme na to!')).toBeVisible();
  await expect(page.getByTestId('card-next')).toHaveCount(1);
  await expect(page.getByText('Úvod jede podle plánu. Nachystej si stroj a jdeme.')).toBeVisible();
  await shot(page, 1, '02-na-rade-start');

  await press(page, page.getByRole('button', { name: 'Jdu na to' }));
  const work = page.getByTestId('card-work');
  await expect(work).toBeVisible();
  await expect(work.getByText('Série 1 ze 3')).toBeVisible();
  await expect(work.getByText('na 35 kg')).toBeVisible();
  await expect(work.getByText('První série. V klidu a čistě.')).toBeVisible();
  await shot(page, 1, '03-cvicim');

  // 1 ťuknutí = zalogovaná série → Vydýchej se
  await press(page, page.getByRole('button', { name: 'Série hotová' }));
  const rest = page.getByTestId('card-rest');
  await expect(rest.getByText('Série 1 je doma.')).toBeVisible();
  await expect(rest.getByText('Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál.')).toBeVisible();
  await expect(rest.getByText('8× na 35 kg')).toBeVisible();
  await shot(page, 1, '04-vydychej-se');

  await press(page, page.getByRole('button', { name: 'Jdu na další sérii' }));
  await press(page, page.getByRole('button', { name: 'Série hotová' }));
  await press(page, page.getByRole('button', { name: 'Jdu na další sérii' }));
  await expect(page.getByText('Poslední série. Dotáhni to!')).toBeVisible();
  await shot(page, 1, '05-posledni-serie');
  await press(page, page.getByRole('button', { name: 'Série i cvik hotový' }));

  // Po poslední sérii žádná pauza: rovnou další karta Na řadě s pochvalou
  await expect(page.getByTestId('card-rest')).toHaveCount(0);
  await expect(page.getByText('Tlak na prsa máš v kapse!')).toBeVisible();
  await expect(page.getByTestId('card-next').first()).toContainText('Přítahy horní kladky');
  await shot(page, 1, '06-dalsi-karta');

  for (let i = 0; i < 5; i++) expect(await doExercise(page)).toBe('next');
  await expect(page.getByText('Závěr, už jen kousek. Ty to dáš.')).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Jdu na to' }));
  for (let i = 0; i < 2; i++) {
    await press(page, page.getByTestId('log-set'));
    await press(page, page.getByRole('button', { name: 'Jdu na další sérii' }));
  }
  await expect(page.getByText('Poslední série celého tréninku. Dej do toho všechno!')).toBeVisible();
  await expect(page.getByTestId('log-set')).toHaveText(/Hotovo, trénink je tvůj!/);
  await shot(page, 1, '07-posledni-serie-treninku');
  await press(page, page.getByTestId('log-set'));

  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  await expect(page.getByText('z 22')).toBeVisible();
  await shot(page, 1, '08-shrnuti');

  await expect.poll(async () => (await stats(page)).sets, { timeout: 30_000 }).toBe(22);
});

test('B7: obsazený stroj — švihnutí jen v hlavní části, přeskočený jde hned potom', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  // úvod: jediná karta, nedá se švihnout
  await expect(page.getByTestId('card-next')).toHaveCount(1);
  await doExercise(page);
  await expect(page.getByTestId('card-next')).toHaveCount(1);
  await doExercise(page);

  // hlavní část: Leg press + 3 další karty „Nebo tohle“
  const cards = page.getByTestId('card-next');
  await expect(cards).toHaveCount(4);
  await expect(page.getByText('Obsazeno? Švihni kartu doleva, k tomuhle se vrátíme.')).toBeVisible();
  await page.getByTestId('carousel').evaluate((el) => el.scrollTo({ left: 336, behavior: 'instant' }));
  await expect(cards.nth(1)).toBeInViewport();
  await expect(cards.nth(1)).toContainText('Nebo tohle');
  await expect(cards.nth(1)).toContainText('Leg press počká, vrátíme se k němu hned potom.');
  await shot(page, 1, '09-svihnuti-nebo-tohle');
  await press(page, cards.nth(1).getByRole('button', { name: 'Jdu na to' }));

  await expect(page.getByTestId('card-work')).toContainText('Veslování na kladce');
  await expect(page.getByText('Pak: Leg press (vracíme se)')).toBeVisible();
  await shot(page, 1, '10-pak-vracime-se');
  // dokončit veslování
  for (;;) {
    const label = (await page.getByTestId('log-set').textContent()) ?? '';
    await press(page, page.getByTestId('log-set'));
    if (label.includes('Série i cvik hotový')) break;
    await press(page, page.getByRole('button', { name: 'Jdu na další sérii' }));
  }
  await expect(cards.first()).toContainText('Vracíme se');
  await expect(cards.first()).toContainText('Leg press');
});

test('B9: zavření appky a znovuotevření vrátí stejnou kartu ve stejném stavu', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await press(page, page.getByRole('button', { name: 'Jdu na to' }));
  await press(page, page.getByRole('button', { name: 'Série hotová' }));
  await expect(page.getByText('Série 1 je doma.')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('card-rest')).toBeVisible();
  await expect(page.getByText('Série 1 je doma.')).toBeVisible();
  await expect(page.getByText('Další série 2 ze 3')).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Pokračovat v tréninku' }).click();
  await expect(page.getByTestId('card-rest')).toBeVisible();
});

test('Zpět místo dialogu vrátí omylem zalogovanou sérii', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await press(page, page.getByRole('button', { name: 'Jdu na to' }));
  await press(page, page.getByRole('button', { name: 'Série hotová' }));
  await press(page, page.getByRole('button', { name: 'Zpět' }));
  await expect(page.getByTestId('card-work')).toContainText('Série 1 ze 3');
});
