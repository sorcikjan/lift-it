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

- [ ] Starší týdenní sheety naimportované jako historie.
- [ ] Položky upravené podle zkušeností z prvních tréninků (seznam doplníme).
- [ ] Po tréninku se ke shrnutí sám připojí tep a kalorie z Garminu přes Stravu a do popisu aktivity ve Stravě se zapíšou odcvičené série.

Doplňková kritéria z požadavků fáze:

- [ ] A9: odcvičené hodnoty jdou jedním ťuknutím zapsat zpět do trenérova sheetu.
- [ ] B14: superserie A1/A2 jde bez pauzy, pauza až po dvojici.
- [ ] B15: série i cvik navíc mimo plán.
- [ ] D6: tělesná měření se ukládají a mají graf.
- [ ] Kotouče: u váhy na čince je vidět, co nasadit na každou stranu.
