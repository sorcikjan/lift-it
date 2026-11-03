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

- [ ] Vložení odkazu na sheet a import týdne do 1 min; podruhé bez mapování.
- [ ] Neznámý název cviku jde spárovat jedním ťuknutím a příště se spáruje sám.
- [ ] Opětovný import nezmění už odcvičené tréninky.
- [ ] Detail cviku ukazuje vývoj od prvního tréninku a změnu v %.
- [ ] Trenér otevře odkaz na shrnutí bez přihlášení.
