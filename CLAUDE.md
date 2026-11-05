# Lift It: pokyny pro Claude Code

Stavíš **Lift It**, mobilní PWA pro silový trénink v posilovně (iPhone, česky). Uživatel je začátečník, cvičí podle týdenního plánu od trenéra a během tréninku nechce appku zkoumat: chce vědět, co teď cvičit a kolikrát.

## Zdroje pravdy

1. `docs/PRD.md`: kompletní zadání (požadavky A–G s ID, datový model, architektura, fáze a akceptační kritéria).
2. Kapitola **Flow tréninku** v PRD: závazný popis obrazovky tréninku, stavů karty a textů. Při rozporu s jinou částí PRD platí ona.
3. `docs/prototype/`: klikací prototyp, ze kterého flow vzniklo (viz `docs/prototype/README.md`). Ber z něj chování, rozložení, barvy a texty, **ne kód**.
4. `fixtures/`: skutečné týdenní plány trenéra (CSV) a ukázkový Trénink A (`ukazkovy-trenink-a.json`).

Místa v PRD označená **[PŘEDPOKLAD]** ber jako rozhodnutá, dokud je uživatel nezmění. Otevřené otázky z PRD řeš, jen když opravdu blokují práci.

## Jak postupovat

- Stav po fázích z kapitoly *Plán dodávky*. Začni fází 1. Před kódem napiš krátký plán fáze (soubory, kroky, testy) do `docs/plan-faze-1.md`.
- Každá fáze končí nasazenou funkční verzí, zelenými testy a splněnými akceptačními kritérii z PRD. Kritéria odškrtávej v `docs/plan-faze-N.md`.
- ID požadavků (A1, B7, …) používej v názvech commitů a testů.
- Když `fixtures/` neobsahuje CSV od trenéra, postav fázi 1 nad `fixtures/ukazkovy-trenink-a.json` a parser nech na fázi 2.

## Stack (z PRD)

Název appky (manifest, ikona na ploše, titulek): **Lift It**. Rozhraní je česky.

Next.js (App Router) + TypeScript + Tailwind, PWA přes Serwist, lokální data v IndexedDB (Dexie), backend Supabase (Postgres, Auth Google, RLS), hosting Vercel. Testy: Vitest (čisté funkce) a Playwright ve viewportu 390 × 844 s vypnutou sítí.

## Obrazovka tréninku: co musí platit

Od redesignu 11/2026 (docs/rozhodnuti.md 35–40) platí místo tří stavů karty z PRD:

- Trénink je **jeden seznam**: hotové cviky nahoře odškrtnuté, aktuální cvik jako rozsvícená karta, zbytek pod ní.
- Karta: animovaná postava cviku (`ExerciseFigure`, vzor z `figureFor`), cíl série, kotouče, „Minule …“, pruhy sérií a **jedno tlačítko „Série N hotová“** (akce `tap` v automatu). Pauza je jen zelený text „Série N je doma.“ na kartě.
- Po poslední sérii cviku rovnou další cvik se zelenou pochvalou.
- **Žádné odpočty ani časovače.** Žádná úprava váhy a opakování během tréninku: hodnoty určuje plán. Odchylky se opravují ve shrnutí.
- Bloky **úvod / hlavní část / závěr**. Pořadí podle plánu; jen v hlavní části jde ťuknutím na řádek cvičit jiný cvik, přeskočený přijde hned po něm.
- Zelená = cokoli hotového, vždy s ikonou. Texty z tabulky *Texty (feel-good)* v PRD v `src/i18n/cs.json`, tón kamarádský, sentence case, bez emoji.
- Stavový automat je čistá funkce `reducer(state, action)` s unit testy; obrazovku odvozuje `deriveRun` (`src/domain/workout/run-view.ts`).
- Pohyb respektuje `prefers-reduced-motion`.

## Design tokeny

| Token | Hodnota | Použití |
| --- | --- | --- |
| guma | #111418 | pozadí (redesign 11/2026) |
| grafit | #1B1F24 | plochy (karty s okrajem `hrana` #262C33) |
| krida | #F2F4F1 | text, karta Na řadě |
| ocel | #9AA3AB | vedlejší text |
| modra-akce | #3B7BFF | akční tlačítka (Začít trénink, Série N hotová) s přechodem a září, data v grafech |
| modra-karta | #1F55C8 | stav Cvičím |
| zluta | #E3B23C | stav Vydýchej se, tmavý text |
| splneno | #34C77B | vše hotové, vždy s ikonou |

Písmo: Barlow Condensed (čísla, nadpisy, tabulkové číslice) a Barlow (text), obě z Google Fonts. Dotykové plochy ≥ 56 px, mezery ≥ 12 px, hlavní akce v dolní třetině, desetinná čárka (37,5 kg).

## Kontrola práce

Ke každé fázi pořiď v Playwrightu screenshoty klíčových obrazovek (390 × 844) do `docs/screenshots/faze-N/` a porovnej je s prototypem. U obrazovky tréninku projdi celou smyčku: Na řadě → Cvičím → Vydýchej se → … → další karta → shrnutí.
