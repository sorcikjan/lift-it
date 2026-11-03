# Plán fáze 2: Import a progres

Požadavky: A1–A5, D1–D4, E1.

## Soubory

| Oblast | Soubory |
| --- | --- |
| Google Sheets (modul za rozhraním) | `src/integrations/google-sheets/{types,url,api,csv-export,mock,index}.ts` |
| Tokeny | `src/server/crypto.ts` (AES-GCM), `src/app/api/google/token/route.ts` |
| Čtení sheetu | `src/app/api/sheets/read/route.ts` → `{ tabs, rows }` |
| Klient | `src/components/SheetLinkInput.tsx`, uložené mapování (`src/client/sheets.ts`) |
| Progres | `src/app/progres/page.tsx` (seznam + %), `src/app/progres/cvik/page.tsx` (graf 1RM, max. váha, objem, tabulka, rekordy), `src/components/charts/*` |
| Docházka | domov + progres (D4) |
| Sdílení | `src/components/ShareButton.tsx`, `src/app/s/[token]/page.tsx` (server, bez přihlášení) |

## Kroky

1. Modul Google Sheets: rozbor odkazu (spreadsheetId, gid), API v4 pod tokenem uživatele, záloha CSV export pro veřejné sheety, mock nad fixturami. Výpadek modulu vrátí chybu jen importu.
2. Token: po přihlášení se Google refresh token uloží šifrovaně (integration_tokens), server si access token obnoví sám; když chybí, appka požádá o přihlášení.
3. Import odkazem: vložit odkaz → výběr listu → mapování (příště samo, A2) → náhled → uložit. Opětovný import stejného listu aktualizuje jen neodcvičené tréninky (A5).
4. Progres: seznam cviků „Leg press +32 %“ se sparkline, detail s grafem odhadu 1RM (body = tréninky, baseline linka), max. váha a objem jako samostatné grafy, tabulkové zobrazení, historie rekordů. Docházka týdnů.
5. Sdílení: odkaz na shrnutí bez přihlášení přes `get_shared_session(token)`.
6. Testy: unit (URL, CSV, šifrování, sheets modul s mockem), e2e (import odkazem s mockem, podruhé bez mapování, reimport nepřepíše odcvičené, progres po dvou trénincích, sdílený odkaz bez přihlášení).

## Akceptační kritéria (PRD)

- [x] Vložení odkazu na sheet a import týdne do 1 min; podruhé bez mapování.
  Ověřeno: e2e `faze2.spec.ts` „A1, A2, A5“ — import odkazem přes mock modulu Sheets měří čas (< 60 s, ve skutečnosti ~5 s),
  při druhém importu stejného listu se mapování nezobrazí. Unit testy modulu: rozbor odkazu, API v4 s tokenem,
  vypršený token → požádat o přihlášení, CSV záloha, neveřejný sheet, mock. **Proti skutečnému Google sheetu neověřeno** (chybí OAuth klient).
- [x] Neznámý název cviku jde spárovat jedním ťuknutím a příště se spáruje sám.
  Ověřeno: e2e `import.spec.ts` (fáze 1) — spárování jedním ťuknutím, alias se uloží, další import už název nehlásí; unit testy `matchExercise`.
- [x] Opětovný import nezmění už odcvičené tréninky.
  Ověřeno: e2e „A1, A2, A5“ — po odcvičení Tréninku A se reimportuje list se změněnými váhami; Trénink A zůstane (40 kg, 7 cviků),
  Trénink B se aktualizuje (5 × 5, 50 kg), appka hlásí „Aktualizováno 1 neodcvičených tréninků“.
- [x] Detail cviku ukazuje vývoj od prvního tréninku a změnu v %.
  Ověřeno: e2e „D1, D2, E1“ — dva tréninky, ve druhém leg press 45 kg; seznam ukazuje +13 %, detail „od začátku“, graf 1RM s výchozím stavem
  a rekordem, tabulkové zobrazení; unit testy `progress.test.ts` (e1RM, změna od startu, rekordy, docházka). Screenshoty 04, 05.
- [x] Trenér otevře odkaz na shrnutí bez přihlášení.
  Ověřeno: e2e „D1, D2, E1“ — odkaz otevřený v novém kontextu prohlížeče bez cookie ukáže trénink, cviky a odchylky od plánu;
  RLS test: anonym čte jen přes `get_shared_session(token)`.
