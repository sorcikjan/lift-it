# PRD – Lift It (tréninková appka trenér ↔ cvičenec)

2026-11-03 · @Jan

## Stav dokumentu a otevřené otázky

Verze 0.2: doplněný flow tréninku ověřený na klikacím prototypu (3. 11. 2026). Cílem je zadání, podle kterého Claude Code postaví funkční aplikaci po fázích. Místa označená **[PŘEDPOKLAD]** jsou můj návrh; potvrď je nebo oprav.

- [x] **Telefon:** iPhone s iOS 18.4+, takže displej jde držet rozsvícený i v appce nainstalované na ploše. Android se v MVP netestuje.
- [x] **Zápis série:** váha + opakování, předvyplněné plánem. RPE ne.
- [x] **Uživatelé:** trenér s více klienty. Schéma je na to připravené od začátku, rozhraní pro trenéra přijde ve fázi 4.
- [x] **Hodinky:** tréninky dnes měříš na Garminu jako obecnou aktivitu. Garmin se automaticky synchronizuje do Stravy, propojení proto jde přes Strava API, viz modul G.
- [ ] **Formát trenérova sheetu:** odkaz nebo screenshot jednoho týdne. Rozhoduje o parseru (sloupce, zápis sérií, více tréninků v jednom listu?).
- [ ] **Vizuál cviku:** stačí obrázek začátku a konce pohybu + 3 body techniky, nebo chceš video?
- [ ] **Přihlášení a hosting:** přihlášení Google účtem a běh na Vercel + Supabase (free tier) je OK?
- [ ] **Tělesná měření:** sledovat i hmotnost a obvody, nebo jen výkon?
- [ ] **Strava:** propojíš appku jednou se svým účtem Strava (přihlášení přes Stravu)? Bez toho appka data z hodinek nenačte.

## Problém a kontext

Trenér posílá týdenní plán jako odkaz na Google Sheet (název cviku, váha, počet opakování). V posilovně se s ním na telefonu pracuje špatně a nevzniká žádná historie výkonu.

Současný stav: dva tréninky týdně do Vánoc 2026 (zhruba 14 tréninků), jeden s trenérem a jeden sám, poté nejspíš dlouhodobě dál. Trenér pracuje v Google Sheets a není jisté, že bude chtít změnit nástroj.

| Bolest | Dnes | Co appka udělá |
| --- | --- | --- |
| Zhasne displej a sheet hledám znovu | Odemknout, najít odkaz, najít řádek | Obrazovka tréninku drží displej rozsvícený a po odemčení je přesně tam, kde jsem skončil |
| Pamatovat si série, váhu, opakování | Opakovaně otevírám sheet | Jedna velká karta: aktuální cvik, série 2 ze 4, 40 kg × 10 |
| Nevím, jak cvik vypadá | Hledám na internetu | Obrázek a tři body techniky přímo na kartě |
| Stroj je obsazený | Ztrácím přehled, co už mám hotové | Švihnutím karty vybereš jiný cvik z hlavní části; k přeskočenému se appka vrátí hned potom |
| Žádný přehled progresu | Data rozházená v týdenních sheetech | Každá série se uloží, grafy vývoje od prvního tréninku |
| Trenér neví, co jsem sám reálně odcvičil | Ústně při dalším tréninku | Sdílené shrnutí tréninku odkazem, později přímý přehled pro trenéra |

## Cíle, ne-cíle a metriky úspěchu

Hlavní cíl: odcvičit celý trénink bez jediného otevření Google Sheetu a každou sérii mít uloženou pro dlouhodobý progres.

**Cíle**

1. V posilovně jedna obrazovka a jedno ťuknutí na sérii.
2. Každá odcvičená série uložená (váha, opakování), aby šlo porovnat začátek a současnost.
3. Nový týdenní plán od trenéra v appce do jedné minuty: vložit odkaz, zkontrolovat, uložit.
4. Připraveno pro trenéra: knihovna cviků a tvorba plánu v appce, aniž by ho bylo nutné hned přesvědčovat.

**Ne-cíle (MVP):** výživa, kardio a GPS, sociální funkce, platby a fakturace trenéra, nativní appka v App Store / Google Play, AI generování plánů.

| Metrika | Cíl |
| --- | --- |
| Tréninky odcvičené přes appku do Vánoc | ≥ 90 % naplánovaných |
| Otevření Google Sheetu během tréninku | 0 |
| Od obdržení odkazu po připravený trénink | < 1 min |
| Ťuknutí na zalogování série splněné podle plánu | 1 |
| Obnova po zhasnutí displeje nebo zavření appky | 0 kroků, appka je na stejném místě |

## Uživatelé a role

MVP slouží jednomu cvičenci; trenér se do něj dostává nepřímo přes svůj sheet. Datový model ale od začátku počítá s trenérem, který má víc klientů **(potvrzeno)**.

| Role | Kdo | Co potřebuje | Fáze |
| --- | --- | --- | --- |
| Cvičenec | Jan, začátečník, cílevědomý a datově založený | V posilovně: co teď, kolik, jak to vypadá. Doma: jak se zlepšuju | MVP |
| Trenér | Osobní trenér, dnes zadává v Google Sheets | Rychle zadat týden, vidět co klient reálně odcvičil, okomentovat | MVP nepřímo, v2 přímo |
| Správce | Jan | Knihovna cviků, párování názvů ze sheetu, export dat | MVP |

## Klíčové scénáře

Osm scénářů definuje MVP; poslední dva jsou příprava pro trenéra ve v2. Každý scénář je zároveň E2E test.

1. **Import týdne.** Trenér pošle odkaz. Jan ho vloží do appky, ta načte sheet, spáruje názvy cviků s knihovnou a neznámé nabídne ke spárování jedním ťuknutím. Po kontrole náhledu uloží týden s tréninky A a B.
2. **Trénink sám.** Domov ukazuje dnešní trénink a tlačítko Začít trénink. Pak celý trénink běží na jedné obrazovce s kartou cviku: Na řadě → Jdu na to → Cvičím → Série hotová → Vydýchej se → Jdu na další sérii → … → Série i cvik hotový → další karta Na řadě. Displej celou dobu svítí.
3. **Obsazený stroj.** Kartu Na řadě švihne do strany a zvolí jiný cvik z hlavní části. Přeskočený cvik se zařadí hned za zvolený, ne na konec tréninku. Úvod a závěr jdou vždy podle plánu.
4. **Odchylka od plánu.** Váhu a opakování určuje trenér a v posilovně se neupravují. Když zvládl 8 místo 10, opraví to po tréninku ve shrnutí [PŘEDPOKLAD]. Volitelná poznámka („bolí rameno“).
5. **Trénink s trenérem.** Stejný postup; trenér na místě řekne jinou váhu a Jan ji přepíše. Trénink je označený „s trenérem“.
6. **Přerušení.** Telefon se zamkne nebo se appka zavře. Po otevření pokračuje přesně na stejné sérii, včetně běžící pauzy.
7. **Bez signálu.** Celý trénink funguje offline, data se syncnou po připojení.
8. **Progres.** Doma otevře Progres, vybere cvik a vidí vývoj váhy a odhadovaného maxima v čase a srovnání první vs. poslední trénink v procentech.
9. **Trenér zadává v appce (v2).** Vybere klienta, zkopíruje minulý týden, upraví váhy, přidá cviky z knihovny a publikuje. Jan dostane notifikaci.
10. **Zpětná vazba (v2).** Trenér vidí odcvičené hodnoty a poznámky a okomentuje cvik nebo celý trénink; Jan odpoví.

## Funkční požadavky

MVP je vše, co je potřeba k odcvičení tréninku a uložení dat; v1.1 zpříjemňuje import a progres; v2 je trenérská část. ID používej v commitech a testech.

### A. Plán a import

| ID | Požadavek | Priorita |
| --- | --- | --- |
| A1 | Vložení odkazu na Google Sheet a načtení přes Google Sheets API pod účtem uživatele (jen čtení) | MVP |
| A2 | Průvodce mapováním sloupců (cvik, série, opakování, váha, pauza, poznámka, trénink); mapování se uloží a příště použije samo | MVP |
| A3 | Párování názvů na knihovnu: přesná shoda, alias, fuzzy návrh; potvrzení jedním ťuknutím se uloží jako alias | MVP |
| A4 | Náhled importu před uložením, nejasné buňky zvýrazněné | MVP |
| A5 | Opětovný import stejného sheetu: aktualizuje neodcvičené tréninky, odcvičená data nikdy nepřepíše | MVP |
| A6 | Ruční vytvoření a úprava tréninku v appce (záloha, když import selže) | MVP |
| A7 | Vložení tabulky kopírováním (Ctrl+C z sheetu) jako alternativa k API | MVP |
| A8 | Import starších týdenních sheetů jako výchozí stav (baseline) | v1.1 |
| A9 | Zpětný zápis skutečně odcvičených hodnot do trenérova sheetu (vyžaduje právo úpravy) | v1.1 |

### B. Trénink v posilovně

| ID | Požadavek | Priorita |
| --- | --- | --- |
| B1 | Domovská obrazovka = dnešní trénink, seznam cviků, stav týdne a jedno velké tlačítko Začít trénink | MVP |
| B2 | Trénink běží na jedné obrazovce s jednou kartou cviku ve stavech Na řadě, Cvičím, Vydýchej se (viz Flow tréninku) | MVP |
| B3 | Karta Na řadě: název, obrázek začátku a konce pohybu, plán (série · opakování · váha), nápověda; tlačítko Jdu na to | MVP |
| B4 | Karta Cvičím: série X ze Y, cílová opakování obřím písmem, váha, povzbuzení; zalogování série jedním ťuknutím (předvyplněno plánem) | MVP |
| B5 | Karta Vydýchej se po každé sérii kromě poslední; bez odpočtu a časovače; tlačítko Jdu na další sérii | MVP |
| B6 | Po poslední sérii cviku rovnou další karta Na řadě se zelenou pochvalou; přesun ke stroji = odpočinek | MVP |
| B7 | Trénink rozdělený na úvod, hlavní část a závěr; v hlavní části švihnutí karty Na řadě nabídne jiný cvik a přeskočený se zařadí hned za zvolený | MVP |
| B8 | Displej zůstává rozsvícený po celou dobu tréninku (Screen Wake Lock) | MVP |
| B9 | Stav tréninku uložený lokálně po každé akci; obnova na stejné kartě ve stejném stavu | MVP |
| B10 | Offline: trénink běží bez sítě, zápisy se syncnou později | MVP |
| B11 | Typy cviků: váha × opakování, jen opakování (vlastní váha), čas (plank) | MVP |
| B12 | Shrnutí po tréninku: délka, objem, nové osobní rekordy; tady jde opravit skutečná opakování a váhu [PŘEDPOKLAD] | MVP |
| B13 | Poznámka ke cviku a k tréninku (diktování přes klávesnici telefonu) | MVP |
| B14 | Superserie a okruhy (A1/A2), pokud je trenér používá | v1.1 |
| B15 | Přidat sérii nebo cvik navíc mimo plán | v1.1 |

### C. Knihovna cviků

| ID | Požadavek | Priorita |
| --- | --- | --- |
| C1 | Základní knihovna naimportovaná z otevřené databáze (viz Knihovna cviků) | MVP |
| C2 | České názvy a aliasy pro nejčastějších zhruba 100 cviků | MVP |
| C3 | Detail cviku: obrázky, 3–5 kroků techniky česky, svaly, vybavení, volitelný odkaz na video | MVP |
| C4 | Vlastní cvik a vlastní fotka (vyfotit konkrétní stroj v posilovně) | MVP |
| C5 | Hledání a filtry podle svalu a vybavení (hlavně pro trenéra) | v2 |

### D. Progres

| ID | Požadavek | Priorita |
| --- | --- | --- |
| D1 | Graf na cvik: max. pracovní váha a odhad 1RM v čase | MVP |
| D2 | Srovnání začátek vs. teď na cvik a souhrnně v procentech | MVP |
| D3 | Osobní rekordy a jejich historie | MVP |
| D4 | Docházka: tréninky za týden vs. plán | MVP |
| D5 | Export všech dat do CSV | MVP |
| D6 | Tělesná měření (hmotnost, obvody), pokud je chceš | v1.1 |

### E. Trenér a komunikace

| ID | Požadavek | Priorita |
| --- | --- | --- |
| E1 | Sdílené shrnutí tréninku odkazem bez přihlášení (trenér nemusí nic instalovat) | MVP |
| E2 | Účet trenéra, pozvánka klienta, více klientů | v2 |
| E3 | Editor plánu: týden → tréninky → cviky z knihovny; kopírovat minulý týden; hromadně +2,5 kg | v2 |
| E4 | Přehled klienta: odcvičeno vs. plán, poznámky, grafy | v2 |
| E5 | Komentáře k tréninku a cviku obousměrně | v2 |
| E6 | Notifikace o novém plánu a komentáři (web push v nainstalované appce) | v2 |

### F. Účet a data

| ID | Požadavek | Priorita |
| --- | --- | --- |
| F1 | Přihlášení Google účtem (zároveň přístup ke sheetům) | MVP |
| F2 | Rozhraní česky, jednotky kg, desetinná čárka | MVP |
| F3 | Instalace na plochu telefonu (PWA) | MVP |

### G. Hodinky Garmin přes Stravu

Data z hodinek appka bere ze Stravy, kam se Garmin synchronizuje sám; přímé Garmin API je jen záloha. Silové tréninky dnes do Stravy chodí s délkou, kaloriemi a relative effort, ale bez cviků a sérií (ověřeno na tréninku z 23. 10., 27. 10. a 1. 11.). Zdrojem pravdy pro série proto zůstává appka, hodinky dodávají tep a kalorie. Strava API čtení sérií silového tréninku zatím nenabízí ([Strava Community Hub](https://communityhub.strava.com/developers-api-7/read-access-for-strength-training-exercises-sets-detailedactivity-13765)), i když Strava letos přidala vlastní log sérií ([9to5Mac](https://9to5mac.com/2026/05/21/strava-adds-dedicated-strength-training-support-for-sets-reps-weight-and-muscle-groups/)). Garmin od října 2026 dává jednotlivcům osobní API klíč, jen pro čtení ([the5krunner](https://the5krunner.com/2026/10/22/garmin-personal-api/), [Garmin Developers](https://developer.garmin.com/gc-developer-program/overview)); plán do hodinek neposílá ani jedna cesta.

| ID | Požadavek | Priorita |
| --- | --- | --- |
| G1 | Propojení se Stravou přes OAuth (čtení aktivit, zápis popisu); tokeny šifrovaně na serveru, automatická obnova | v1.1 |
| G2 | Po tréninku dohledat ve Stravě aktivitu podle časového překryvu se Session a připojit průměrný a max. tep, kalorie, délku | v1.1 |
| G3 | Shrnutí ukazuje stav párování: čekám na data z hodinek / spárováno / aktivita nenalezena, zkusit znovu | v1.1 |
| G4 | Zápis odcvičených cviků a sérií do popisu spárované aktivity ve Stravě (např. „Leg press 4 × 10, 40 kg“), lze vypnout | v1.1 |
| G5 | Tep a kalorie ve shrnutí tréninku a jako další graf v Progresu | v1.1 |
| G6 | Nápověda: na hodinkách spouštět profil Silový trénink místo obecné aktivity | MVP |
| G7 | Přímé napojení na Garmin Personal API jako záloha, kdyby Strava přestala stačit | Později |
| G8 | Zápis sérií do strength logu Stravy | Mimo rozsah, dokud to API spolehlivě nepodporuje |
| G9 | Odeslání plánu do hodinek | Mimo rozsah |

Datově: Session dostane pole strava_activity_id, stav_parovani, tep_prumer, tep_max, kcal (a rezervu garmin_activity_id pro G7). Strava vyžaduje souhlas každého uživatele zvlášť, takže trenérovi klienti si Stravu propojí každý sám.

## UX principy a obrazovky

Appka má jen tři obrazovky v dolní liště (Trénink, Progres, Knihovna). Samotný trénink je jediná obrazovka s kartou cviku, která mění stav. Žádné vnořené menu, žádné psaní, žádné odpočty.

**Principy pro použití v posilovně**

- **Jedna ruka, palec.** Hlavní akce dole, dotykové plochy min. 56 px, mezi nimi ≥ 12 px (zpocené prsty).
- **Barva = stav.** Bílá karta Na řadě, modrá Cvičím, žlutá Vydýchej se, zelená = hotovo. Stav se pozná bez čtení.
- **Čitelné na metr.** Počet opakování obřím písmem (≥ 150 px), vysoký kontrast, tmavý režim jako výchozí.
- **Vždy vím, kde jsem.** Trénink A · cvik 3 ze 7, série 2 ze 4 a pod kartou řádek „Pak: …“.
- **V klidu.** Žádné odpočty ani časovače. Pauza trvá, jak dlouho chci.
- **Feel-good texty.** Krátké, povzbudivé, lidské (viz Flow tréninku).
- **Nic se nemusí psát ani nastavovat.** Váhy a opakování jsou dané plánem, poznámky diktováním.
- **Zpět místo dialogů.** Omyl se vrací tlačítkem Zpět, ne potvrzovacím oknem.
- **Švihnutí jen tam, kde dává smysl.** Karta Na řadě se švihá do strany pro jiný cvik; každou kartu jde vybrat i ťuknutím na její tlačítko.

### Flow tréninku (ověřeno prototypem)

Trénink je jedna obrazovka a jedna karta cviku ve třech stavech; každý krok je jedno ťuknutí. Klikací prototyp: [Silový trénink – PWA prototyp](https://claude.ai/artifact/T98Ckt6hKbYov92TPir6h4).

| Stav | Karta | Co ukazuje | Tlačítko | Další stav |
| --- | --- | --- | --- | --- |
| Na řadě | bílá #F2F4F1 | název, obrázek začátku a konce pohybu, plán „4 série · 10× · 40 kg“, nápověda | Jdu na to (modré) | Cvičím |
| Cvičím | modrá #1F55C8 | série X ze Y s tečkami, obří „10×“, „na 40 kg“, povzbuzení | Série hotová (zelené); u poslední série „Série i cvik hotový“ | Vydýchej se; po poslední sérii další karta Na řadě |
| Vydýchej se | žlutá #E3B23C | zelená fajfka a „Série 2 je doma.“, „Dej si tolik času, kolik potřebuješ“, náhled další série | Jdu na další sérii (tmavé) | Cvičím |

- **Začátek:** první karta Na řadě se zelenou lištou „Převlečený? Tak jdeme na to!“.
- **Mezi cviky:** po „Série i cvik hotový“ naskočí rovnou další karta Na řadě se zelenou pochvalou („Leg press máš v kapse!“). Přesun ke stroji je zároveň odpočinek, samostatná pauza není.
- **Konec:** poslední série celého tréninku má tlačítko „Hotovo, trénink je tvůj!“ a vede na shrnutí.
- **Pod kartou** je vždy jeden řádek „Pak: <další cvik>“ (u odloženého „vracíme se“) a 7 teček postupu, hotové zeleně. Nahoře Ukončit.

**Pořadí a obsazený stroj**

- Trénink má tři části: úvod (pevné pořadí), hlavní část (dá se přehazovat), závěr (pevné pořadí). Rozdělení dává trenérův plán.
- Výchozí pořadí je vždy podle plánu.
- Na kartě Na řadě v hlavní části jsou další cviky vedle sebe se štítkem „Nebo tohle“. Zvolený cvik jde hned, přeskočené se zařadí hned za něj, ne na konec tréninku.
- V úvodu a závěru se nešvihá; karta řekne „Úvod jede podle plánu“.

**Texty (feel-good)**

| Moment | Text |
| --- | --- |
| Start | Převlečený? Tak jdeme na to! |
| Na řadě | Nachystej si stroj a jdeme. · Obsazeno? Švihni kartu doleva, k tomuhle se vrátíme. |
| První série | První série. V klidu a čistě. |
| Uprostřed | Drž tempo, jedeš. · Ještě tahle a jedna. Jde ti to. |
| Poslední série cviku | Poslední série. Dotáhni to! |
| Poslední série tréninku | Poslední série celého tréninku. Dej do toho všechno! |
| Pauza | Série 2 je doma. · Dobrá práce. · Pěkně ti to jde. + Dej si tolik času, kolik potřebuješ. Až budeš chtít, jdeme dál. |
| Cvik hotový | Leg press máš v kapse! |
| Konec | Hotovo, trénink je tvůj! |

Tón: kamarád, ne drill seržant. Sentence case, bez emoji, bez VELKÝCH PÍSMEN, všechny texty v jednom souboru (cs.json).

**Co v tréninku záměrně není:** odpočet pauzy, úprava váhy a opakování tlačítky ±, pruh všech zbývajících cviků, potvrzovací dialogy.

**Obrazovky**

| Obrazovka | Obsah | Hlavní akce |
| --- | --- | --- |
| Trénink (domov) | Dnešní trénink, seznam cviků s cíli, stav týdne (1 ze 2) | Začít trénink |
| Trénink (běh) | Jedna karta cviku ve stavech Na řadě, Cvičím, Vydýchej se; pod ní „Pak: …“ a postup | Jdu na to · Série hotová · Jdu na další sérii |
| Shrnutí | Délka, objem, rekordy, oprava odchylek, poznámky, data z hodinek, sdílet trenérovi | Hotovo · Sdílet |
| Progres | Seznam cviků se změnou od začátku v %, detail s grafem | Otevřít cvik |
| Knihovna | Hledání, detail cviku | Otevřít detail |
| Import (z domova) | Vložit odkaz, mapování, náhled | Uložit týden |

Drátěný model karty nahrazuje klikací prototyp ([Silový trénink – PWA prototyp](https://claude.ai/artifact/T98Ckt6hKbYov92TPir6h4)); jeho zdroj je i v předávacím balíčku pro Claude Code (docs/prototype).

**Vizuální směr [PŘEDPOKLAD].** Inspirace světem posilovny, ne fitness šablonou: gumová podlaha, křída, soutěžní kotouče. Odvážná je barva karty podle stavu a obří počet opakování; vše ostatní tiché. Zelená štědrá tam, kde je něco hotové: má to dělat radost.

| Token | Hodnota | Použití |
| --- | --- | --- |
| Guma | #1C2024 | Pozadí |
| Grafit | #2A3036 | Plochy |
| Křída | #F2F4F1 | Hlavní text a čísla, karta Na řadě |
| Ocel | #9AA3AB | Vedlejší text |
| Kotoučová modrá | #2F6FE4 | Akční tlačítka (Začít trénink, Jdu na to), data v grafu |
| Modrá karta | #1F55C8 | Stav Cvičím; o odstín tmavší kvůli kontrastu bílého textu |
| Kotoučová žlutá | #E3B23C | Stav Vydýchej se, na ní tmavý text |
| Splněno | #3FAF6B | Vše hotové: tlačítko Série hotová, hotové série a cviky, pochvala, rekordy; vždy s ikonou |

Písmo: Barlow Condensed (čísla a nadpisy, tabulkové číslice) a Barlow (text); obě zdarma na Google Fonts a s češtinou. Malá vychytávka pro v1.1: u váhy na čince ukazovat, jaké kotouče nasadit na každou stranu (např. 40 kg = osa 20 kg + 10 kg na každou stranu), barevně podle soutěžních kotoučů.

## Datový model

Plán a skutečnost jsou oddělené: trenér plánuje (PlannedSet), cvičenec loguje (LoggedSet). Díky tomu jde porovnat plán vs. realitu a import nikdy nepřepíše odcvičená data.

| Entita | Klíčová pole | Poznámka |
| --- | --- | --- |
| User | id, role (athlete / coach / admin), jméno, e-mail, jednotky | Jeden uživatel může být cvičenec i trenér |
| CoachClient | coach_id, client_id, stav | Příprava na v2, víc klientů na trenéra |
| Exercise | id, name_cs, name_en, typ (weight_reps / reps / time), vybavení, svaly[], obrázky[], kroky_cs[], video_url, zdroj, licence, autor | Globální knihovna + vlastní cviky uživatele |
| ExerciseAlias | text (normalizovaný bez diakritiky), exercise_id, owner_id | Každé ruční spárování ze sheetu |
| Program | id, client_id, coach_id, název, začátek, konec, cíl | Např. „Do Vánoc 2026“ |
| PlanWeek | id, program_id, začátek týdne, zdroj (sheet / app / manual), sheet_url, list, importováno, raw_snapshot | Snapshot surových dat pro dohledatelnost |
| Workout | id, week_id, označení (A / B), pořadí, plánované datum, poznámka | Naplánovaný trénink |
| PlannedExercise | id, workout_id, exercise_id, pořadí, blok (uvod / hlavni / zaver), skupina (superserie), poznámka trenéra |  |
| PlannedSet | id, planned_exercise_id, číslo, opakování od–do, váha_kg, čas_s, typ (rozcvička / pracovní), do selhání | Rozsah 8–10 i „max“ |
| Session | id, user_id, workout_id (nullable), začátek, konec, s trenérem, poznámka, stav, skutečné pořadí cviků (po přehození) | Skutečný trénink; i bez plánu |
| LoggedSet | id (UUID z klienta), session_id, exercise_id, planned_set_id (nullable), číslo, opakování, váha_kg, čas_s, RPE, přeskočeno, čas zápisu | Základ celého progresu |
| Comment | id, autor, cíl (session / logged_set / workout), text, vytvořeno | v2 |
| ImportMapping | id, owner_id, spreadsheet_id, mapování sloupců (JSON), rozložení | Pamatuje si formát trenéra |
| ShareLink | id, session_id nebo program_id, token, platnost | Sdílení bez přihlášení (E1) |

Pravidla: váhy v kg jako decimal s krokem 0,25; ID záznamů generuje klient (UUID), aby offline zápisy šly bezpečně opakovat; nic se nemaže natvrdo, jen archivuje.

## Import z Google Sheets a migrace trenéra

Trenér nemusí nic měnit: appka čte jeho sheet pod tvým Google účtem, protože ti ho už sdílí. Parser se ale dá napsat spolehlivě až podle skutečného vzorku sheetu (otevřená otázka č. 1).

| Způsob načtení | Jak | Plus | Mínus | Role |
| --- | --- | --- | --- | --- |
| Google Sheets API | OAuth uživatele, scope jen pro čtení tabulek | Funguje s běžným sdílením, čte i víc listů | Nastavení Google Cloud projektu a OAuth obrazovky | Hlavní cesta |
| Export CSV z odkazu | `…/export?format=csv&gid=…` | Bez OAuth | Jen když je sheet sdílený „kdokoli s odkazem“ | Záloha |
| Vložení kopírováním | Označit buňky, kopírovat, vložit do appky (TSV) | Funguje vždy | Ruční krok | Nouzová cesta |

**Co musí parser zvládnout [PŘEDPOKLAD, ověřit na vzorku]**

- Zápisy sérií: `3x10`, `3×10`, `4 × 8–10`, `10/10/8`, váhy `40`, `40 kg`, `22,5`, `40/45/50` (stoupající), `BW` nebo prázdné = vlastní váha, `30 s` = čas, `max` = do selhání.
- Více tréninků v týdnu: samostatné listy, nebo bloky oddělené nadpisem („Trénink A“, „Středa“).
- Názvy cviků s překlepy a bez diakritiky: normalizace (malá písmena, bez diakritiky, bez interpunkce), pak alias, pak fuzzy shoda.
- Bloky tréninku: úvod, hlavní část, závěr (nadpis v sheetu, nebo sloupec „blok“). Bez označení appka v náhledu importu nabídne rozdělení: první a poslední cvik pevně, zbytek hlavní část [PŘEDPOKLAD].
- Buňky, které nejdou přečíst, se nezahodí: v náhledu jsou zvýrazněné a jdou opravit.
- Parser je čistá funkce `parseSheet(rows, mapping) → PlanWeekDraft` s testy nad fixturami ze skutečných sheetů.

**Cesta trenéra do appky (bez nátlaku)**

1. **Nic nemění.** Posílá sheet jako dosud; ty importuješ.
2. **Vidí výsledky.** Po tréninku mu pošleš odkaz na shrnutí (E1), případně appka zapíše odcvičené hodnoty zpět do jeho sheetu (A9). Trenér získá hodnotu, aniž by cokoli instaloval.
3. **Šablona.** Nabídneš mu šablonu sheetu, kterou appka čte na 100 %; pro něj je to jen hezkčí tabulka.
4. **Editor.** Až když bude chtít: kopírování minulého týdne a hromadné +2,5 kg je rychlejší než sheet. Když nebude chtít, zůstává krok 1 navždy a appka funguje stejně.

## Knihovna cviků

Základ knihovny je [free-exercise-db](https://github.com/yuhonas/free-exercise-db): 873 cviků v JSON s obrázky, veřejná doména, takže ji lze bez omezení zabalit do appky. Nad ní je česká vrstva a vlastní cviky.

| Zdroj | Rozsah | Licence | Použití |
| --- | --- | --- | --- |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | 873 cviků, obrázky začátku a konce pohybu, svaly, vybavení, instrukce EN | Veřejná doména | Základní seed (C1) |
| [wger](https://github.com/wger-project/wger) | Komunitní knihovna, více jazyků | Data pod Creative Commons dle cviku | Volitelné doplnění, nutná atribuce u cviku |
| Česká vrstva | ~100 nejčastějších cviků: název, aliasy, 3–5 kroků techniky | Vlastní | Vygeneruje Claude Code, zkontroluješ ty (příp. trenér) |
| Vlastní cviky | Cokoli, co trenér zadá a v knihovně není; fotka stroje z tvé posilovny | Vlastní | Přednost před seedem |

Aliasy jsou klíč k importu: trenér píše „tlak na prsa“, „bench“ i „bench press“ a všechny musí vest na stejný cvik, jinak se rozpadne historie progresu. Proto každé ruční spárování vytvoří alias a sloučení dvou cviků musí přenést i historii.

## Progres a statistiky

Progres odpovídá na jednu otázku: o kolik jsem silnější než na začátku. Výchozí stav (baseline) je první zalogovaný trénink každého cviku.

| Metrika | Definice | Kde |
| --- | --- | --- |
| Max. pracovní váha | Nejvyšší váha pracovní série v tréninku (rozcvička se nepočítá) | Graf cviku |
| Odhad 1RM | Epley: váha × (1 + opakování / 30), maximum z pracovních sérií; jen pro 1–12 opakování | Graf cviku, rekordy |
| Objem | Σ váha × opakování za cvik a za trénink | Shrnutí, týdenní přehled |
| Změna od začátku | (poslední odhad 1RM − první) / první v % | Seznam v Progresu |
| Splnění plánu | Zalogované / naplánované série v % | Shrnutí, trenér |
| Docházka | Odcvičené tréninky za týden vs. plán (2) | Domov |
| Osobní rekord | Nové maximum váhy, odhadu 1RM nebo opakování při dané váze | Shrnutí, historie |

**Grafy (pravidla pro implementaci)**

- Detail cviku: jedna čárová osa času, odhad 1RM jako čára 2 px, skutečné tréninky jako body ≥ 8 px; baseline jako tichá vodorovná linka s popiskem.
- Nikdy dvě osy Y. Objem a váha jsou dva samostatné grafy pod sebou.
- Seznam cviků v Progresu není graf, ale číslo: „Leg press +32 %“ s mini křivkou (sparkline).
- Jedna barva pro data (kotoučová modrá), mřížka a osy tiché, popisky v barvě textu, ne v barvě série.
- Na dotyk tooltip s datem, sériemi a poznámkou z tréninku; každý graf má i tabulkové zobrazení.
- Tmavý režim s vlastními odstíny ověřenými proti pozadí, ne automatické převrácení barev.

## Technické zadání a architektura

Mobile-first webová aplikace instalovatelná na plochu (PWA), offline-first, s jednou databází v cloudu. Stack **[PŘEDPOKLAD]** je zvolený tak, aby ho Claude Code postavil a nasadil zdarma a bez vlastního serveru.

| Vrstva | Volba | Proč |
| --- | --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind | Jedna codebase pro web i PWA, snadné nasazení |
| PWA | Web manifest + service worker (Serwist) | Instalace na plochu, offline cache aplikace a obrázků cviků |
| Lokální data | IndexedDB přes Dexie | Aktivní trénink a fronta zápisů k synchronizaci |
| Backend | Supabase: Postgres, Auth (Google), Storage, Row Level Security | Role cvičenec/trenér řeší RLS, bez vlastního API serveru |
| Google Sheets | Sheets API v4 ze serverové route, scope jen pro čtení | Token neodchází do prohlížeče |
| Grafy | Recharts nebo visx | Dotykové tooltipy, SVG |
| Hosting | Vercel + Supabase free tier | 0 Kč pro jednoho až desítky uživatelů |
| Testy | Vitest (parser, výpočty), Playwright v mobilním viewportu (scénáře 1–8) | Každý scénář = E2E test |

**Technická rizika k řešení hned na začátku**

- **Držení displeje.** Screen Wake Lock API funguje v Safari od iOS 16.4, ale v aplikaci přidané na plochu až po opravě chyby v iOS 18.4 ([Progressier](https://progressier.com/pwa-capabilities/screen-wake-lock), [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545)). Zámek se uvolňuje při odchodu z appky, takže ho appka znovu žádá při návratu (`visibilitychange`). Na starších zařízeních fallback (NoSleep.js) a viditelná ikonka, zda displej drží.
- **Google token.** Supabase při přihlášení vrací Google access token, ale sám ho neobnovuje. Import proto potřebuje buď uložený refresh token (offline access, šifrovaně na serveru), nebo krátké znovupřihlášení před importem. Ověřit v aktuální dokumentaci.
- **Ověření Google OAuth.** Scope pro čtení tabulek je citlivý; pro osobní použití stačí appka v testovacím režimu se seznamem testovacích uživatelů (ty, trenér).
- **Offline synchronizace.** Zápisy jsou idempotentní upserty podle UUID z klienta; konflikt = poslední zápis vyhrává na úrovni série.

- **Hodinky přes Stravu.** Párování čeká na synchronizaci hodinek (minuty po tréninku), proto stav „čekám na data“ a opakovaný pokus. Podmínky a limity Strava API se mění; přístup ke Stravě (i k Garmin Personal API) oddělit do jednoho modulu, aby výpadek nerozbil zbytek appky.

**Pokyny pro Claude Code (do CLAUDE.md)**

- Stavět po fázích z kapitoly Plán dodávky; každá fáze končí nasazenou funkční verzí a zelenými testy.
- Datové schéma a RLS včetně rolí trenéra od fáze 1, i když trenérské UI přijde až ve v2.
- Vývoj a kontrola vždy ve viewportu 390 × 844 a s vypnutou sítí; screenshoty klíčových obrazovek ke každé fázi.
- Všechny texty rozhraní česky v jednom souboru; čísla s desetinnou čárkou.
- Parser sheetu a výpočty progresu jako čisté funkce s unit testy; fixtury ze skutečného trenérova sheetu.
- Seed knihovny jako skript (`pnpm seed:exercises`), opakovatelně spustitelný.
- Flow tréninku stavěj podle kapitoly Flow tréninku a referenčního prototypu v docs/prototype (stavový automat je v Karta.dc.html); texty z tabulky Texty použij beze změny.

## Plán dodávky a akceptační kritéria

Fáze 1 má být použitelná v posilovně do 16. 11. 2026 i bez importu: plán se zatím vloží zkopírováním tabulky. Termíny jsou návrh **[PŘEDPOKLAD]**.

_[plán dodávky · 4 fáze, 3 brány: viz dokument PRD]_

Další fáze začíná až po splnění brány předchozí; fáze 4 jen tehdy, když o ni trenér stojí.

**Fáze 1: Do posilovny** (A6, A7, B1–B13, C1–C4, D5, F1–F3)

- [ ] Vložení tabulky z trenérova sheetu vytvoří trénink se správnými cviky, sériemi a váhami.
- [ ] Zalogování série podle plánu = 1 ťuknutí; po něm karta přejde do stavu Vydýchej se, po poslední sérii na další kartu Na řadě.
- [ ] Displej nezhasne během 60 min tréninku na tvém telefonu.
- [ ] Zavření appky a znovuotevření vrátí stejnou kartu ve stejném stavu.
- [ ] Celý trénink v režimu letadlo; po připojení jsou všechny série v databázi právě jednou.
- [ ] Švihnutí karty Na řadě v hlavní části nabídne jiný cvik a přeskočený přijde hned po něm; v úvodu a závěru švihnout nejde.
- [ ] Každý cvik z prvního týdne má obrázek a české kroky techniky.

**Fáze 2: Import a progres** (A1–A5, D1–D4, E1)

- [ ] Vložení odkazu na sheet a import týdne do 1 min; podruhé bez mapování.
- [ ] Neznámý název cviku jde spárovat jedním ťuknutím a příště se spáruje sám.
- [ ] Opětovný import nezmění už odcvičené tréninky.
- [ ] Detail cviku ukazuje vývoj od prvního tréninku a změnu v %.
- [ ] Trenér otevře odkaz na shrnutí bez přihlášení.

**Fáze 3: Doladění** (A8, A9, B14, B15, D6, G1–G5, kotouče)

- [ ] Starší týdenní sheety naimportované jako historie.
- [ ] Položky upravené podle zkušeností z prvních tréninků (seznam doplníme).

- [ ] Po tréninku se ke shrnutí sám připojí tep a kalorie z Garminu přes Stravu a do popisu aktivity ve Stravě se zapíšou odcvičené série.

**Fáze 4: Trenér v appce** (C5, E2–E6)

- [ ] Trenér vytvoří týden kopírováním minulého rychleji než v Google Sheets.
- [ ] Trenér vidí tvoje odcvičené hodnoty a může je okomentovat.

**Jak to předat Claude Code:** předávací balíček (CLAUDE.md, docs/PRD.md, docs/prototype, fixtures/) rozbalit do prázdné složky projektu, do fixtures/ přidat 2–3 skutečné týdenní sheety jako CSV a v té složce spustit Claude Code se zadáním „Postav fázi 1“. Při změně PRD stačí nahradit docs/PRD.md novým exportem.
