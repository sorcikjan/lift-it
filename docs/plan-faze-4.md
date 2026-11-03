# Plán fáze 4: Trenér v appce

Požadavky: C5, E2–E6.

## Soubory

| Oblast | Soubory |
| --- | --- |
| DB | `supabase/migrations/003_coach.sql` (`invite_info(token)` pro stránku pozvánky bez přihlášení) |
| Server | `src/server/coach.ts` (klienti, přehled klienta pod RLS trenéra, zápis plánu pro klienta), `src/server/sync.ts` (`pullFor`) |
| API | `src/app/api/coach/{become,invite,invite-info,accept,clients,client,write,end}/route.ts`, `src/app/api/comments/route.ts`, `src/app/api/push/subscribe/route.ts` |
| Doména | `src/domain/coach/plan-ops.ts` (čisté funkce: kopie týdne, +2,5 kg, úprava tréninku, docházka klienta) |
| Upozornění | `src/integrations/push/{types,web-push,mock,index}.ts` (web push s VAPID, mock) |
| UI | `/trener` (klienti, pozvánka), `/trener/klient?id=` (přehled, týdny, plán, tréninky, komentáře, progres), `/trener/trenink?klient=&id=` (editor), `/pozvanka?token=`, komentáře ve shrnutí, upozornění v Účtu |

## Kroky

1. E2: „Jsem trenér“ v Účtu (`become_coach`), pozvánka odkazem (14 dní), přijetí po přihlášení, víc klientů, ukončení spolupráce.
2. E3: editor plánu: kopie posledního týdne do dalšího týdne jako koncept, hromadně +2,5 kg u všech sérií s váhou, úprava tréninku (cviky z knihovny, série, opakování, váha), publikace. Klient vidí jen publikované týdny (RLS `week_visible`).
3. E4: přehled klienta: docházka odcvičeno vs. plán po týdnech, poslední tréninky s odcvičeným vs. plánem, poznámky, progres cviků (změna v % + sparkline).
4. E5: komentáře k tréninku a ke cviku, obousměrně (trenér v přehledu klienta, klient ve shrnutí).
5. E6: web push v nainstalované appce: přihlášení k odběru v Účtu, upozornění klientovi na publikovaný plán, druhé straně na nový komentář. Bez klíčů VAPID modul mlčí; v testech mock.
6. C5: hledání a filtry podle svalu a vybavení (hotové od fáze 1, ověřit testem).
7. Testy: unit (plan-ops), RLS (koncept klient nevidí, trenér zapíše plán jen svému klientovi, komentáře), e2e (pozvánka → klient; trenér zkopíruje týden, +2,5 kg, publikuje → klient ho má na domově; klient odcvičí → trenér vidí hodnoty a okomentuje → klient komentář vidí; upozornění odeslaná v mocku).

## Akceptační kritéria (PRD)

- [ ] Trenér vytvoří týden kopírováním minulého rychleji než v Google Sheets.
- [ ] Trenér vidí tvoje odcvičené hodnoty a může je okomentovat.

Doplňková kritéria z požadavků fáze:

- [ ] E2: účet trenéra, pozvánka klienta, více klientů.
- [ ] E4: přehled klienta: odcvičeno vs. plán, poznámky, grafy.
- [ ] E5: komentáře obousměrně.
- [ ] E6: upozornění na nový plán a komentář.
- [ ] C5: hledání a filtry podle svalu a vybavení.
