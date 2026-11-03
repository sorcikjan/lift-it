# Plán fáze 1: Do posilovny

Požadavky: A6, A7, B1–B13, C1–C4, D5, F1–F3 (+ B14/B15 v reduceru rovnou, UI ve fázi 3).
Cíl: použitelné v posilovně do 16. 11. 2026, plán se vkládá zkopírováním tabulky.

## Architektura (rozhodnutí v docs/rozhodnuti.md)

- **Klient (offline-first):** Next.js App Router, většina obrazovek jako klientské komponenty nad IndexedDB (Dexie).
  Aktivní trénink se ukládá po každé akci. Zápisy jdou do fronty `outbox` s UUID z klienta.
- **Server:** API routy `/api/sync` (idempotentní upsert dávky) a `/api/pull` (plán a historie pro další zařízení).
  Pod rolí `authenticated` s `auth.uid()`, takže platí RLS z migrací. Jedno rozhraní `Db`:
  PGlite (lokálně a v testech, bez Dockeru) nebo Supabase Postgres (`DATABASE_URL`).
- **Přihlášení:** Supabase Auth (Google). Bez nastavených klíčů běží vývojový uživatel.
- **PWA:** Serwist, precache appky a knihovny, runtime cache obrázků cviků, manifest „Lift It“.

## Soubory

| Oblast | Soubory |
| --- | --- |
| Schéma a RLS | `supabase/migrations/001_schema.sql`, `002_rls.sql`, `supabase/dev/auth-stub.sql`, `tests/rls.test.ts` |
| Knihovna | `scripts/seed-exercises.ts`, `seed/cs-exercises.json`, `public/library/exercises.json` |
| Doména | `src/domain/types.ts`, `format.ts`, `workout/reducer.ts`, `workout/view.ts`, `plan/parse-sheet.ts`, `plan/match.ts` |
| Texty | `src/i18n/cs.json`, `src/i18n/t.ts` |
| Lokální data | `src/client/db.ts` (Dexie), `src/client/repo.ts`, `src/client/sync.ts`, `src/client/library.ts` |
| Server | `src/server/db/*`, `src/server/auth.ts`, `src/app/api/sync`, `src/app/api/pull` |
| Obrazovky | `/` domov, `/trenink` běh, `/shrnuti/[id]`, `/knihovna`, `/knihovna/[id]`, `/knihovna/novy`, `/import`, `/plan/[workoutId]`, `/ucet` |
| PWA | `src/app/manifest.ts`, `src/app/sw.ts`, ikony v `public/icons` |
| Testy | Vitest: reducer, view, parser, párování, sync server, RLS. Playwright: `e2e/*.spec.ts` (390 × 844) |

## Kroky

1. Schéma, RLS a testy RLS nad PGlite.
2. Seed knihovny a česká vrstva (110 cviků, k mé kontrole).
3. Reducer + odvození karty + texty z cs.json; unit testy pro každý přechod.
4. Parser vložené tabulky `parseSheet(rows, mapping)` + automatické mapování + párování názvů (A7).
5. Dexie, outbox, sync a pull; server `/api/sync` s idempotentním upsertem.
6. Obrazovky: domov (B1), trénink (B2–B8, B13), shrnutí (B12, B13), knihovna (C1–C4), import vložením (A7), ruční úprava (A6), export CSV (D5), účet (F1).
7. PWA (F3), wake lock (B8) s ikonkou a `visibilitychange`.
8. Playwright: celá smyčka tréninku, švihnutí, obnova po reloadu, offline + sync (každá série v DB právě jednou), screenshoty.

## Akceptační kritéria (PRD)

- [x] Vložení tabulky z trenérova sheetu vytvoří trénink se správnými cviky, sériemi a váhami.
  Ověřeno: `e2e/import.spec.ts` (vložení TSV, náhled, párování překlepů, kontrola sérií a vah na domově) a 49 unit testů parseru. **Na skutečném sheetu zatím ne.**
- [x] Zalogování série podle plánu = 1 ťuknutí; po něm karta přejde do stavu Vydýchej se, po poslední sérii na další kartu Na řadě.
  Ověřeno: `e2e/trenink.spec.ts` (celá smyčka, 22 sérií v DB) a unit testy reduceru B4 → B5, B6.
- [ ] Displej nezhasne během 60 min tréninku na tvém telefonu.
  Ověřeno jen v emulaci (`e2e/wakelock.spec.ts`: zámek drží, po návratu do appky se znovu vyžádá). **Čeká na test na iPhonu.**
- [x] Zavření appky a znovuotevření vrátí stejnou kartu ve stejném stavu.
  Ověřeno: `e2e/trenink.spec.ts` B9 (reload na kartě Vydýchej se) a unit test obnovy z JSON.
- [x] Celý trénink v režimu letadlo; po připojení jsou všechny série v databázi právě jednou.
  Ověřeno: `e2e/offline.spec.ts` (service worker, offline start i celý trénink, po připojení 22 = 22 unikátních, reload nic nezdvojí) a `tests/sync.test.ts`.
- [x] Švihnutí karty Na řadě v hlavní části nabídne jiný cvik a přeskočený přijde hned po něm; v úvodu a závěru švihnout nejde.
  Ověřeno: `e2e/trenink.spec.ts` B7 a 7 unit testů reduceru.
- [x] Každý cvik z prvního týdne má obrázek a české kroky techniky.
  Ověřeno: `tests/library.test.ts` (všech 7 cviků ukázkového Tréninku A má 2 obrázky a 3–5 kroků). Skutečný první týden od trenéra zatím nemám.
