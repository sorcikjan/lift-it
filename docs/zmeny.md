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

## Fáze 2: Import a progres

**Hotové**
- Import odkazem na Google Sheet (A1): modul `src/integrations/google-sheets` za rozhraním — API v4 pod tokenem uživatele,
  záloha přes CSV export pro veřejné sheety, mock nad fixturami. Výběr listu, náhled, uložení.
- Zapamatované mapování sloupců (A2), opětovný import aktualizuje jen neodcvičené tréninky (A5).
- Google obnovovací token se po přihlášení ukládá šifrovaně (AES-256-GCM) na server; když vyprší, appka požádá o přihlášení.
- Progres (D1–D4): seznam cviků se změnou v % a sparkline, celkové „silnější o“, detail s grafem odhadu 1RM (výchozí stav + rekord),
  max. váhou a objemem jako samostatnými grafy, tabulkové zobrazení, historie rekordů, docházka týdnů.
- Sdílení shrnutí odkazem bez přihlášení (E1).

**Ověření**
- Vitest: 170 testů zelených (1 přeskočený: test proti skutečnému Postgresu, běží jen s `DATABASE_URL`).
- Playwright 9/9 zelených, nové: import odkazem do 1 min + reimport, progres po dvou trénincích + sdílený odkaz v anonymním okně.
- Screenshoty: `docs/screenshots/faze-2/`. Barvy grafů ověřené validátorem kontrastu (modrá #2F6FE4 na pozadí #1C2024).

**Co není hotové / jen mock**
- Čtení skutečného Google sheetu: kód hotový, ověřený jen proti mocku a zaznamenaným odpovědím API. Potřebuju OAuth klienta (viz `docs/setup.md`).
- Nasazení na Vercel stále čeká na účty.

## Fáze 3: Doladění

**Hotové**
- A8: starší týdenní sheety jako historie (Účet → Starší týdny jako historie). Progres pak počítá od skutečného začátku.
- A9: „Zapsat do trenérova sheetu“ ve shrnutí — do sloupce „Odcvičeno“ za daty zapíše „4 × 10, 45 kg“ na řádek každého cviku.
  Nic jiného v sheetu nemění. Právo úprav si appka vyžádá až při prvním zápisu.
- B14: superserie A1/A2 (bez pauzy mezi cviky dvojice, štítky na domově a na kartě). B15: cvik navíc mimo plán ve shrnutí.
- D6: tělesná měření s grafem hmotnosti.
- G1–G5: Strava — propojení v Účtu (tokeny šifrovaně, automatická obnova), po tréninku samo dohledá aktivitu z hodinek podle času,
  ukáže tep a kalorie, zapíše série do popisu aktivity (jde vypnout), stav „čekám na data / spárováno / nenalezeno, zkusit znovu“, graf tepu v progresu.
- Kotouče: na kartě Cvičím a Vydýchej se u cviků s osou, barevně podle soutěžních kotoučů.

**Ověření**
- Vitest: 206 testů zelených. Playwright 12/12 (nové: superserie + kotouče + Strava + zápis do sheetu, čekání na hodinky, historie + cvik navíc + měření).
- Screenshoty: `docs/screenshots/faze-3/`.

**Jen mock / neověřené**
- Strava a zápis do sheetu běží proti mockům; skutečné API potřebují účty (souhrnný seznam na konci).
- Kritérium „položky upravené podle zkušeností z prvních tréninků“ čeká na tvoje připomínky.

## Fáze 4: Trenér v appce

**Hotové:** role trenéra a pozvánka odkazem (E2), editor plánu: kopie minulého týdne jako koncept, +2,5 kg, úprava tréninku, publikace (E3),
přehled klienta (E4), komentáře obousměrně (E5), web push s VAPID (E6), filtry knihovny (C5).
Opraveno: tep a kalorie ze Stravy se teď synchronizují na server. Počet v knihovně ukazuje všechny nalezené cviky.

**Ověření:** Vitest 229 zelených (1 přeskočený), Playwright 14/14. Screenshoty `docs/screenshots/faze-4/`.

**Jen mock:** web push, Strava, zápis do sheetu, Google Sheets. **Nenasazeno na Vercel:** chybí účty.

**Co potřebuju od tebe (souhrnně):** Supabase projekt, Google OAuth klient, Vercel účet napojený na repo, Strava aplikace,
klíče VAPID a `TOKEN_ENCRYPTION_KEY` (postup v `docs/setup.md`). Dál kontrola české knihovny, 2–3 skutečné sheety jako CSV do `fixtures/`
a test v posilovně na iPhonu.

## Po fázi 4: skutečný soubor od trenéra (5. 11. 2026)

**Hotové**
- Trenér posílá tréninky jako **XLSX v mailu**. Import má novou první volbu „Soubor od trenéra (XLSX)“ (víc souborů = víc tréninků týdne). Soubor se čte přímo v telefonu, bez Google přihlášení.
- Parser upravený podle `fixtures/trenink-2.xlsx`: název cviku ve sloučených buňkách, superserie A1/A2 ve vlastním sloupci, poznámka „35 kg na každé straně“, plank „2x1min“ = 2 × 60 s. Nadpis tréninku se nezdvojuje.

**Ověření**
- Vitest: čtečka XLSX (sloučené buňky, chybný soubor, A1 notace), celý trénink z trenérova souboru (9 cviků, superserie v jednom bloku, váhy, čas, poznámka, 0 nejasných buněk), dva soubory = Trénink A a B. Celkem 235 testů.
- Playwright: nahrání souboru v importu → náhled 9 cviků, „3 × 9–10 · 32,5 kg“, dvakrát „Superserie A“. Celkem 15/15. Screenshot `docs/screenshots/faze-4/10-import-xlsx.png`.

**Na tobě**
- Anglické názvy cviků („Lat pulldown - menší nástavec“) poprvé spáruješ s knihovnou ťuknutím na návrh; appka si párování pamatuje (A3).
- Pošli i Trénink 1, ať je parser ověřený na dvou souborech.

## Párování cviků bez ptaní (5. 11. 2026)

**Hotové**
- Import se na cviky neptá. Z trenérova souboru najde samo 7 z 9 cviků (např. „Zakopávání na stroji“ → zakopávání, „Shoulder press DB“ → tlaky na ramena s jednoručkami, „Seated cable row - V adapter“ → veslování na kladce). Dva cviky s medicinbalem, které knihovna nemá, se založí jako vlastní pod trenérovým názvem.
- Odhady a nové cviky jsou v náhledu označené a jdou změnit jedním ťuknutím, ale nemusí.
- Testy už nikdy nesáhnou na ostrou databázi: adresa je v `.env.seed.local` místo `.env.local`.

**Ověření**
- Vitest: jádro názvu, automatický výběr pro názvy od trenéra, slabá shoda se nehádá.
- Playwright: XLSX od trenéra se uloží bez jediného ťuknutí na párování a na domově je všech 9 cviků.

## Obrazovka tréninku na menších displejích (5. 11. 2026)

**Chyba z prvního tréninku na iPhonu:** s dlouhými trenérovými názvy a na nižším displeji (appka z plochy) obsah karty přetékal přes hlavní tlačítko a spodní lištu, tlačítko nešlo pořádně trefit.

**Oprava:** hlavní tlačítko je v kartě vždy připnuté dole; nadpis, velké číslo, obrázky a mezery se zmenšují podle výšky displeje, zbytek obsahu jde v kartě posunout. Dlouhé názvy (> 36 znaků) mají menší písmo.

**Ověření:** nový e2e test `e2e/maly-displej.spec.ts` (375 × 667 a 390 × 763, trenérův trénink): v každém stavu je tlačítko celé vidět, leží uvnitř karty a na jeho středu je opravdu tlačítko. Celá sada 17/17, Vitest 242.

## A1/A2 = úvod, ne superserie (5. 11. 2026)

**Chyba:** první dva řádky trenérova souboru (A1 rotace s medicinbalem, A2 přetahování v lehu) se uložily jako superserie, takže trénink střídal A1 → A2 → A1. Trenér tím ale značí úvod: nejdřív obě série prvního cviku, pak druhého, a nepřeskakuje se.

**Oprava:** označená skupina na začátku tréninku je úvod bez střídání (rozhodnutí 34). Plank na konci zůstává závěr, zbytek hlavní část.

**Ověření:** Vitest na trenérově souboru: A1 a A2 mají blok úvod a žádnou skupinu, cviky 3–8 hlavní část. Celkem 242 testů.

**Na tobě:** soubor nahraj znovu (už uložený týden má A1/A2 pořád jako superserii).

## Redesign podle prototypu v2 (5. 11. 2026, větev `redesign`)

**Hotové**
- **Trénink jako jeden seznam.** Aktuální cvik je rozsvícená karta s animovanou postavou, cílem (8× na 35 kg), kotouči, „Minule 30 kg × 10 · dnes +2,5 kg“, pruhy sérií a jedním tlačítkem „Série 1 hotová“ (pod ním „zbývá ještě 2 série“ / „poslední série cviku“ / „pak hned A2“). Po ťuknutí tlačítko zezelená, rozletí se konfety, na kartě se objeví „Série 1 je doma.“ Hotové cviky jsou nahoře odškrtnuté, další pod kartou; v hlavní části jde ťuknutím na řádek cvičit jiný cvik (obsazený stroj).
- **Minule:** nejtěžší série cviku z posledního odcvičeného tréninku (i z historie).
- **Displej:** zámek se vyžádá znovu při každém ťuknutí; nahoře „Displej svítí“ / „Může zhasnout“.
- **Domov:** pozdrav, karta dnešního tréninku s postavou, štítky (cviky, série, minuty), první tři cviky + „+ N dalších“, Začít trénink se zářícím tlačítkem, stav týdne.
- **Vstup** pro nového uživatele s claimem a přihlášením Googlem.
- **Profil:** avatar, „Cvičí od listopadu 2026“, týden po–ne, tréninky / série / tento týden, Strava (i před nastavením), trenér, displej, historie, export, odhlášení.
- **Shrnutí:** kroužek s odškrtnutím se obtočí.
- Nové barvy a pohyb v celé appce (rozhodnutí 35–40).

**Ověření**
- Vitest: akce `tap` (7), seznam tréninku (6), Minule (3), postavy (15), profil (2). Celkem 277.
- Playwright: celý trénink jedním ťuknutím na sérii, výběr jiného cviku v hlavní části, obnova po reloadu, Zpět, Minule z historie, superserie, kotouče, malé displeje (tlačítko celé vidět, hlavička se nezalomí), zámek displeje po ťuknutí, vstup, profil. Screenshoty `docs/screenshots/faze-5/`.

