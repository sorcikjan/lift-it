# Plán fáze 3: Doladění

Požadavky: A8, A9, B14, B15, D6, G1–G5, kotouče (PRD, Vizuální směr: „u váhy na čince ukazovat, jaké kotouče nasadit“).

## Soubory

| Oblast | Soubory |
| --- | --- |
| A8 historie | `src/client/baseline.ts` (týden → odcvičené Session se `source='baseline'`), import `?historie=1` |
| A9 zápis do sheetu | `src/integrations/google-sheets/write.ts` (rozhraní `SheetsWriter`, API v4 `values:batchUpdate`, mock), `src/domain/plan/writeback.ts` (čistá funkce: odcvičené série → buňky podle mapování), `src/app/api/sheets/write/route.ts`, tlačítko ve shrnutí |
| B14 superserie | reducer už umí; doplnit štítek skupiny („A1“) na kartě a v seznamu, e2e |
| B15 cvik navíc | shrnutí: „Přidat cvik navíc“ → výběr z knihovny → série s `extra=true` |
| D6 měření | `src/app/progres/mereni/page.tsx`, `src/client/measurements.ts`, graf hmotnosti |
| G1–G5 Strava | `src/integrations/strava/{types,api,mock,match,describe,index}.ts`, `src/app/api/strava/{connect,callback,disconnect,pair,status}/route.ts`, `WatchPanel`, `AccountExtras`, graf tepu v progresu |
| Kotouče | `src/domain/plates.ts` (čistá funkce), `src/components/Plates.tsx` na kartě Cvičím u cviků s osou |

## Kroky

1. Kotouče: `platesPerSide(totalKg, barKg=20, available=[25,20,15,10,5,2.5,1.25])` → seznam kotoučů; barvy podle soutěžních kotoučů. Ukázat jen u cviků s vybavením „barbell“. Unit testy.
2. A8: import starších sheetů jako historie (zadané datum týdne → každý trénink = Session `done`, `source='baseline'`, série podle plánu). Progres je bere jako výchozí stav.
3. B14: štítek skupiny na kartách a v seznamu; e2e superserie (A1 → A2 bez pauzy).
4. B15: přidání cviku navíc ve shrnutí.
5. D6: měření (datum, hmotnost, obvody), seznam a graf hmotnosti.
6. A9: zápis odcvičených hodnot zpět do sheetu: nový sloupec „Odcvičeno“ vedle sloupce cviku na stejném listu, text „45 × 10, 45 × 10“. Vyžaduje scope `spreadsheets` (úpravy); bez práva vrátí srozumitelnou chybu. Mock v testech.
7. G1–G5: OAuth Stravy (tokeny AES-GCM v `integration_tokens`, automatická obnova), párování podle časového překryvu (čistá funkce), stav ve shrnutí s „zkusit znovu“, zápis popisu (vypínatelný), tep a kalorie ve shrnutí a graf průměrného tepu v progresu. Mock Stravy (`INTEGRATIONS_MOCK=1`).
8. Testy: unit (kotouče, baseline, writeback, Strava match/describe/api/token refresh), RLS beze změny, e2e (historie, superserie, cvik navíc, měření, Strava mock: propojit → trénink → spárováno, tep ve shrnutí, popis aktivity zapsaný).

## Akceptační kritéria (PRD)

- [x] Starší týdenní sheety naimportované jako historie.
  Ověřeno: e2e `faze3.spec.ts` „A8, B15, D6“ — vložený starší týden (leg press 30 kg, 7. 9.) se uloží jako odcvičený, domov ho nenabízí,
  progres pak ukazuje „start 30 kg × 10“ a +33 %. Unit `baseline.test.ts` (rozložení tréninků do týdne, série podle plánu, progres od historie).
- [ ] Položky upravené podle zkušeností z prvních tréninků (seznam doplníme).
  Nejde splnit beze mě: čeká na tvoje první tréninky v posilovně a seznam připomínek.
- [x] Po tréninku se ke shrnutí sám připojí tep a kalorie z Garminu přes Stravu a do popisu aktivity ve Stravě se zapíšou odcvičené série.
  Ověřeno proti mocku Stravy: e2e „Kotouče, B14, A9, G1–G4“ — propojení přes OAuth (mock), po tréninku se bez ťuknutí ukáže tep 118/156 a 342 kcal,
  popis aktivity = původní text z Garminu + blok „Odcvičeno v Lift It“ se všemi cviky. e2e „G3“ — hodinky ještě nesynchronizovaly → „Čekám na data
  z hodinek“, „Zkusit znovu“ spáruje. Unit: párování podle překryvu, popis bez zdvojení, OAuth, obnova a odvolání tokenu (PGlite), šifrování v DB.
  **Proti skutečné Stravě neověřeno** (chybí Strava aplikace a tvoje hodinky).

Doplňková kritéria z požadavků fáze:

- [x] A9: odcvičené hodnoty jdou jedním ťuknutím zapsat zpět do trenérova sheetu.
  Ověřeno: e2e — tlačítko ve shrnutí zapíše do mock sheetu sloupec „Odcvičeno“ (hlavička + řádek každého cviku, nic jiného). Unit: výpočet buněk,
  existující sloupec, změněné pořadí, A1 notace, volání API v4 a chybějící právo úprav. **Proti skutečnému sheetu neověřeno.**
- [x] B14: superserie A1/A2 jde bez pauzy, pauza až po dvojici.
  Ověřeno: e2e — import „A1 Tlak na prsa / A2 Přítahy“: na domově A1/A2, karta „Hlavní část · Superserie A“, po sérii A1 rovnou Cvičím A2
  (bez Vydýchej se), pauza až po dvojici; unit testy reduceru (fáze 1).
- [x] B15: série i cvik navíc mimo plán.
  Ověřeno: e2e — ve shrnutí „Přidat cvik navíc“ → Kliky → 15 opakování, uloženo jako „navíc“; série navíc už z fáze 1 (karta Na řadě i shrnutí).
- [x] D6: tělesná měření se ukládají a mají graf.
  Ověřeno: e2e — dvě měření (84 a 82,5 kg, pas), seznam od nejnovějšího s desetinnou čárkou, graf hmotnosti. Screenshot 08.
- [x] Kotouče: u váhy na čince je vidět, co nasadit na každou stranu.
  Ověřeno: e2e — dřep 40 kg ukáže „Na každou stranu: 10 kg, osa 20 kg“ na kartě Cvičím i Vydýchej se; unit testy rozkladu (příklad z PRD,
  1,25 kg, nesložitelná váha, jen u osy). Screenshot 02.
