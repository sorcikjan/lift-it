# Rozhodnutí

Místa, kde PRD nebylo jednoznačné nebo kde jsem narazil na omezení. Zvolená je vždy nejjednodušší rozumná varianta.
Když s něčím nesouhlasíš, napiš a změním to.

| # | Téma | Rozhodnutí | Proč |
| --- | --- | --- | --- |
| 1 | Lokální databáze | Místo `supabase start` běží lokálně a v testech **PGlite** (Postgres ve WASM) se stejnými migracemi a RLS. | Na Macu není Docker. PGlite je skutečný Postgres, takže RLS testy platí i pro Supabase. |
| 2 | Přístup k datům | Klient nepíše do Supabase přímo. Zápisy jdou přes `/api/sync` (dávka idempotentních upsertů), čtení přes `/api/pull`. Server se připojí k Postgresu a dotazy pouští pod rolí `authenticated` s `auth.uid()` z ověřeného JWT, takže platí RLS. | Jedna cesta pro PGlite i Supabase, jedna offline fronta, RLS zůstává poslední pojistkou. |
| 3 | Vlastník řádků | Server vždy přepíše `user_id` / `client_id` / `owner_id` na přihlášeného uživatele. Před přihlášením má zařízení lokální náhodné ID. | Trénink jde odcvičit i bez přihlášení; po přihlášení se data bezpečně přiřadí. |
| 4 | Název cviku v tréninku | Na kartě a na domově je **trenérův název ze sheetu** („Tlak na prsa“), v knihovně a progresu název z knihovny. | Odpovídá tomu, co trenér píše, a historie se přesto páruje přes ID cviku. |
| 5 | Dvojité ťuknutí | Po každé akci na obrazovce tréninku 450 ms tlačítka nereagují. | „Série hotová“ a „Jdu na další sérii“ jsou na stejném místě; zpocený palec by jinak přeskočil pauzu. |
| 6 | Omyl v tréninku | Vpravo nahoře je **Zpět** (vrátí poslední krok včetně zalogované série, až 50 kroků). | PRD: „Zpět místo dialogů“. |
| 7 | Ukončit | Bez dialogu: trénink se uzavře, odcvičené série zůstanou, vede na shrnutí. Bez jediné série se trénink označí jako nedokončený. | Bez potvrzovacích dialogů; nic se neztratí. |
| 8 | Poznámka ke cviku | Odkaz „Poznámka ke cviku“ na kartě Vydýchej se (pauza je chvíle na diktování). Poznámka k celému tréninku je ve shrnutí. | Karta Cvičím zůstává čistá. |
| 9 | Adresy stránek | Detaily přes parametr (`/shrnuti?id=…`, `/knihovna/cvik?id=…`) místo `/shrnuti/[id]`. | Všechny stránky appky jsou statické a předem v cache, takže fungují v režimu letadlo. |
| 10 | Fotka stroje (C4) | Zmenšená na 800 px, uložená jako JPEG přímo u cviku (`images`). | Funguje offline a synchronizuje se s cvikem bez dalšího úložiště. |
| 11 | Bez plánu | Domov nabídne „Vyzkoušet ukázkový Trénink A“ z `fixtures/`. | Appka jde vyzkoušet dřív, než přijde první sheet. |
| 12 | Držení displeje | Screen Wake Lock + nové vyžádání při `visibilitychange` a pojistka každých 15 s. Fallback NoSleep.js nepřidávám; ikonka slunce / měsíce ukazuje, jestli displej drží. | Cílový telefon je iOS 18.4+, kde Wake Lock funguje i z plochy. |
| 13 | Export CSV (D5) | Jeden soubor se všemi sériemi, středník, desetinná čárka, BOM. | Otevře se rovnou v českém Excelu i Google Sheets. |
| 14 | Bloky bez označení | První a poslední cvik pevně jen u tréninku se 3 a více cviky (jinak vše hlavní část). | PRD [PŘEDPOKLAD], u krátkého tréninku by úvod i závěr nedávaly smysl. |
| 15 | Výchozí program | Program „Do Vánoc 2026“ s koncem 24. 12. 2026. | Podle kontextu PRD. |
| 16 | Odhlášení | Před odhlášením se fronta odešle a lokální data se smažou. | Na sdíleném telefonu nezůstanou cizí data. |
| 17 | Superserie (B14) | A1 → A2 bez pauzy, pauza Vydýchej se až po dvojici. | Běžný význam superserie. |
| 18 | Série navíc (B15) | Na kartě Na řadě hned po dokončeném cviku odkaz „Ještě jedna série navíc“; ve shrnutí „+“ u cviku. | Bez ± tlačítek v tréninku, jedno ťuknutí. |
| 19 | Rozsah opakování | Na kartě Cvičím se ukáže celý rozsah („8–10“); zalogují se horní hodnoty, opravit jde ve shrnutí. | Váhy a opakování určuje plán, odchylky se opravují po tréninku. |
| 20 | Google token | Viz fáze 2: obnovovací token od Googlu se po přihlášení uloží šifrovaně na serveru; když vyprší, appka požádá o nové přihlášení. | PRD, kapitola Technická rizika. |
