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

- Trénink je **jedna obrazovka s jednou kartou cviku**. Karta má tři stavy:
  - **Na řadě**: bílá karta (#F2F4F1), tlačítko „Jdu na to“.
  - **Cvičím**: modrá karta (#1F55C8), tlačítko „Série hotová“, které je zelené (#3FAF6B).
  - **Vydýchej se**: žlutá karta (#E3B23C), tlačítko „Jdu na další sérii“.
- Po poslední sérii cviku se pauza nezobrazuje: rovnou naskočí další karta Na řadě se zelenou pochvalou.
- **Žádné odpočty ani časovače.** Žádná úprava váhy a opakování během tréninku: hodnoty určuje plán. Odchylky se opravují ve shrnutí.
- Trénink má bloky **úvod / hlavní část / závěr** (`PlannedExercise.blok`). Pořadí je vždy podle plánu. Jen v hlavní části jde kartu Na řadě švihnout na jiný cvik (scroll-snap karusel). Každou kartu jde vybrat i ťuknutím na její tlačítko. Přeskočené cviky se zařadí hned za zvolený, ne na konec.
- Zelená = cokoli hotového: hotové série a cviky, tlačítko Série hotová, pochvaly, rekordy. Vždy s ikonou, nikdy jen barvou.
- Texty ber doslova z tabulky *Texty (feel-good)* v PRD a dej je do `src/i18n/cs.json`. Tón je kamarádský a povzbudivý, sentence case, bez emoji a bez VELKÝCH PÍSMEN.
- Stavový automat implementuj jako čistou funkci (`reducer(state, action)`) s unit testy. Logiku najdeš v `docs/prototype/Karta.dc.html`: metody `candidates`, `go`, `logSet`.

## Design tokeny

| Token | Hodnota | Použití |
| --- | --- | --- |
| guma | #1C2024 | pozadí |
| grafit | #2A3036 | plochy |
| krida | #F2F4F1 | text, karta Na řadě |
| ocel | #9AA3AB | vedlejší text |
| modra-akce | #2F6FE4 | akční tlačítka (Začít trénink, Jdu na to), data v grafech |
| modra-karta | #1F55C8 | stav Cvičím |
| zluta | #E3B23C | stav Vydýchej se, tmavý text |
| splneno | #3FAF6B | vše hotové, vždy s ikonou |

Písmo: Barlow Condensed (čísla, nadpisy, tabulkové číslice) a Barlow (text), obě z Google Fonts. Dotykové plochy ≥ 56 px, mezery ≥ 12 px, hlavní akce v dolní třetině, desetinná čárka (37,5 kg).

## Kontrola práce

Ke každé fázi pořiď v Playwrightu screenshoty klíčových obrazovek (390 × 844) do `docs/screenshots/faze-N/` a porovnej je s prototypem. U obrazovky tréninku projdi celou smyčku: Na řadě → Cvičím → Vydýchej se → … → další karta → shrnutí.
