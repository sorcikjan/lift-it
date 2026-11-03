import { expect, test, type Page } from '@playwright/test';
import { doExercise, freshUser, loadSample, shot } from './helpers';

async function finishWorkout(page: Page) {
  let r = 'next';
  while (r === 'next') r = await doExercise(page);
}

async function pulled(page: Page) {
  return (await page.request.get('/api/pull')).json();
}

test('E2–E6: pozvánka, týden kopírováním, odcvičené hodnoty s komentáři, upozornění', async ({ page, browser }) => {
  test.setTimeout(240_000);
  // Cvičenec odcvičí trénink A
  const athleteId = await freshUser(page);
  await loadSample(page);
  await page.getByRole('button', { name: 'Začít trénink' }).click();
  await finishWorkout(page);
  await expect(page.getByRole('heading', { name: 'Trénink A hotový' })).toBeVisible();
  const sessionId = new URL(page.url()).searchParams.get('id')!;
  await expect.poll(async () => (await pulled(page)).logged_sets.length, { timeout: 30_000 }).toBe(22);
  await page.request.post('/api/push/subscribe', { data: { endpoint: `https://push.example/${athleteId}`, keys: { p256dh: 'k', auth: 'a' } } });

  // E2: trenér
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  const coach = await ctx.newPage();
  const coachId = await freshUser(coach);
  await coach.request.post('/api/push/subscribe', { data: { endpoint: `https://push.example/${coachId}`, keys: { p256dh: 'k', auth: 'a' } } });
  await coach.goto('/trener');
  await coach.getByRole('button', { name: 'Jsem trenér' }).click();
  await coach.getByRole('button', { name: 'Pozvat klienta' }).click();
  const invite = (await coach.getByTestId('invite-url').textContent())!;
  expect(invite).toMatch(/\/pozvanka\?token=/);
  await shot(coach, 4, '01-trener-pozvanka');

  await page.goto(invite);
  await expect(page.getByText('Testovací uživatel tě zve ke spolupráci')).toBeVisible();
  await shot(page, 4, '02-pozvanka');
  await page.getByRole('button', { name: 'Přijmout pozvánku' }).click();
  await expect(page.getByText('Hotovo, teď spolu trénujete.')).toBeVisible();

  // E4: trenér otevře klienta a vidí odcvičené hodnoty vs. plán
  await coach.goto('/trener');
  await coach.getByRole('list', { name: 'Klienti' }).getByRole('link').first().click();
  const sess = coach.getByTestId('coach-session').first();
  await expect(sess).toContainText('Leg press');
  await expect(sess).toContainText('Odcvičeno: 4 × 10, 40 kg');
  await expect(sess).toContainText('plán 4 × 10, 40 kg');

  // E3: nový týden kopírováním minulého: 3 ťuknutí
  const t0 = Date.now();
  await coach.getByRole('button', { name: 'Kopírovat minulý týden' }).click();
  await expect(coach.getByText(/je připravený jako koncept/)).toBeVisible();
  const draft = coach.getByTestId('coach-week').first();
  await expect(draft).toContainText('Koncept');
  await draft.getByRole('button', { name: '+2,5 kg všem' }).click();
  await expect(coach.getByText(/Přidáno 2,5 kg u \d+ sérií/)).toBeVisible();
  await shot(coach, 4, '03-trener-koncept');
  await coach.getByTestId('coach-week').first().getByRole('button', { name: 'Publikovat' }).click();
  await expect(coach.getByText('Publikováno. Klient dostal upozornění.')).toBeVisible();
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(30_000);
  await expect(coach.getByTestId('coach-week').first()).toContainText('Publikováno');

  // klient má nový týden s váhami +2,5 kg a upozornění
  const data = await pulled(page);
  const weeks = (data.plan_weeks as { id: string; week_start: string; published: boolean }[]).sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  expect(weeks).toHaveLength(2);
  expect(weeks[0].published).toBe(true);
  const newWos = (data.workouts as { id: string; week_id: string }[]).filter((w) => w.week_id === weeks[0].id).map((w) => w.id);
  const newPes = (data.planned_exercises as { id: string; workout_id: string; source_name: string }[]).filter((p) => newWos.includes(p.workout_id));
  const legPe = newPes.find((p) => p.source_name === 'Leg press')!;
  expect((data.planned_sets as { planned_exercise_id: string; weight_kg: number }[]).filter((s) => s.planned_exercise_id === legPe.id).map((s) => Number(s.weight_kg))).toEqual([42.5, 42.5, 42.5, 42.5]);
  let pushes = (await (await page.request.get('/api/dev/push')).json()).sent as { endpoint: string; payload: { title: string; url: string } }[];
  expect(pushes.filter((p) => p.endpoint.endsWith(athleteId)).map((p) => p.payload.title)).toContain('Nový plán od trenéra');

  // E3: úprava tréninku v konceptu dalšího týdne (editor trenéra)
  await coach.getByRole('button', { name: 'Kopírovat minulý týden' }).click();
  await expect(coach.getByTestId('coach-week').first()).toContainText('Koncept');
  await coach.getByTestId('coach-week').first().getByRole('link', { name: 'Upravit trénink A' }).click();
  await expect(coach.getByTestId('edit-exercise')).toHaveCount(7);
  await coach.getByTestId('edit-exercise').last().getByRole('button', { name: 'Archivovat' }).click();
  await coach.getByTestId('edit-exercise').filter({ hasText: 'Leg press' }).getByRole('textbox', { name: 'Kg' }).first().fill('47,5');
  await shot(coach, 4, '04-trener-editor');
  await coach.getByRole('button', { name: 'Uložit' }).click();
  await expect(coach.getByTestId('coach-week').first()).not.toContainText('Plank');

  // E5: trenér okomentuje leg press
  await coach.getByRole('button', { name: 'Komentovat: Leg press' }).first().click();
  await coach.getByRole('textbox', { name: 'Komentář: Leg press' }).fill('Pěkně! Příště 42,5 kg.');
  await coach.getByRole('button', { name: 'Odeslat' }).click();
  await expect(coach.getByText('Pěkně! Příště 42,5 kg.')).toBeVisible();
  await expect(async () => coach.getByText('Pěkně! Příště 42,5 kg.').scrollIntoViewIfNeeded({ timeout: 1000 })).toPass();
  await shot(coach, 4, '05-trener-komentar');
  pushes = (await (await page.request.get('/api/dev/push')).json()).sent;
  const toAthlete = pushes.filter((p) => p.endpoint.endsWith(athleteId) && p.payload.title === 'Nový komentář');
  expect(toAthlete.at(-1)?.payload.url).toBe(`/shrnuti?id=${sessionId}`);

  // klient komentář vidí ve shrnutí a odpoví
  await page.goto(`/shrnuti?id=${sessionId}`);
  await expect(page.getByText('Pěkně! Příště 42,5 kg.')).toBeVisible();
  await page.getByRole('button', { name: 'Komentovat', exact: true }).click();
  await page.getByRole('textbox', { name: 'Komentář' }).fill('Díky, zkusím!');
  await page.getByRole('button', { name: 'Odeslat' }).click();
  await expect(page.getByText('Díky, zkusím!')).toBeVisible();
  await expect(async () => page.getByText('Pěkně! Příště 42,5 kg.').scrollIntoViewIfNeeded({ timeout: 1000 })).toPass();
  await shot(page, 4, '06-shrnuti-komentar');
  pushes = (await (await page.request.get('/api/dev/push')).json()).sent;
  expect(pushes.some((p) => p.endpoint.endsWith(coachId) && p.payload.url === `/trener/klient?id=${athleteId}`)).toBe(true);
  await coach.reload();
  await expect(coach.getByText('Díky, zkusím!')).toBeVisible();
  await ctx.close();
});

test('C5: hledání a filtry knihovny podle svalu a vybavení', async ({ page }) => {
  await freshUser(page);
  await page.goto('/knihovna');
  const count = page.getByText(/^\d+ cvik/);
  const n = async () => parseInt((await count.textContent())!, 10);
  await expect.poll(n, { timeout: 30_000 }).toBeGreaterThan(800);
  const all = await n();
  await page.getByRole('combobox', { name: 'Vybavení' }).selectOption('barbell');
  await expect.poll(n).toBeLessThan(all);
  const byEquip = await n();
  await page.getByRole('combobox', { name: 'Sval' }).selectOption('quadriceps');
  await expect.poll(n).toBeLessThan(byEquip);
  expect(await n()).toBeGreaterThan(0);
  await page.getByRole('searchbox').fill('dřep');
  await expect(page.getByRole('link', { name: /Dřep s osou/ }).first()).toBeVisible();
  await shot(page, 4, '07-knihovna-filtry');
});
