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

- [ ] Vložení tabulky z trenérova sheetu vytvoří trénink se správnými cviky, sériemi a váhami.
- [ ] Zalogování série podle plánu = 1 ťuknutí; po něm karta přejde do stavu Vydýchej se, po poslední sérii na další kartu Na řadě.
- [ ] Displej nezhasne během 60 min tréninku na tvém telefonu.
- [ ] Zavření appky a znovuotevření vrátí stejnou kartu ve stejném stavu.
- [ ] Celý trénink v režimu letadlo; po připojení jsou všechny série v databázi právě jednou.
- [ ] Švihnutí karty Na řadě v hlavní části nabídne jiný cvik a přeskočený přijde hned po něm; v úvodu a závěru švihnout nejde.
- [ ] Každý cvik z prvního týdne má obrázek a české kroky techniky.
