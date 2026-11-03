# Změny po fázích

## Fáze 1: Do posilovny

**Hotové**
- Celé datové schéma včetně trenéra, komentářů, sdílení a polí pro Stravu; RLS od začátku s testy (cvičenec jen svoje, trenér jen klienty, ShareLink jen čtení).
- Knihovna: 876 cviků z free-exercise-db + česká vrstva 110 cviků (`seed/cs-exercises.json`), `pnpm seed:exercises`.
- Obrazovka tréninku podle Flow tréninku: jedna karta, tři stavy, karusel v hlavní části, texty doslova z PRD, Zpět místo dialogů.
- Stavový automat `reducer(state, action)` s 29 unit testy (každý přechod, poslední série cviku i tréninku, švihnutí v úvodu a závěru, obnova).
- Offline-first: stav tréninku v IndexedDB po každé akci, fronta zápisů s UUID z klienta, idempotentní upsert na serveru.
- Wake Lock s ikonkou a novým vyžádáním po návratu do appky.
- Vložení tabulky ze sheetu (A7) s náhledem, zvýrazněním nejasných buněk a párováním názvů jedním ťuknutím (A3, A4).
- Ruční úprava a vytvoření tréninku (A6), shrnutí s rekordy a opravou odchylek (B12), poznámky (B13), vlastní cvik s fotkou (C4), export CSV (D5), PWA s ikonou na plochu (F3).

**Ověření**
- Vitest: 140+ testů (reducer, parser, párování, progres, sync, RLS, knihovna, texty).
- Playwright 390 × 844: celá smyčka tréninku, švihnutí, obnova po reloadu, Zpět, Wake Lock, import vložením a **celý trénink v režimu letadlo** s následnou synchronizací (22 sérií v DB, každá právě jednou).
- Screenshoty: `docs/screenshots/faze-1/`.

**Co ode mě nejde ověřit**
- Wake Lock na tvém iPhonu během 60 min tréninku: ověřené jen v emulaci. Prosím vyzkoušej v posilovně.
- Nasazení na Vercel: potřebuju účty (viz souhrnný seznam na konci a `docs/setup.md`).

**Co potřebuju od tebe**
- Zkontrolovat českou vrstvu knihovny (`seed/cs-exercises.json`, pole `zkontrolovano`).
- 2–3 skutečné týdenní sheety jako CSV do `fixtures/` (parser je otestovaný jen na mých fixturách).
