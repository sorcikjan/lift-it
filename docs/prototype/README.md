# Prototyp (referenční, ne k převzetí)

Zdrojové soubory klikacího prototypu z návrhu v Claude (plátno „Silový trénink – PWA prototyp“). Každý `.dc.html` je jedna obrazovka telefonu 390 × 844: HTML s inline styly, šablonovými proměnnými `{{…}}`, bloky `<sc-if>` a `<sc-for>` a logikou ve třídě `Component` dole v souboru. Formát potřebuje runtime návrhového nástroje (`support.js`), který tu není, takže soubory **nespouštěj ani nepřebírej**. Čti je jako specifikaci chování, rozložení a textů.

| Soubor | Co ukazuje |
| --- | --- |
| `Karta.dc.html` | **Hlavní soubor.** Celá obrazovka tréninku: karta ve stavech Na řadě / Cvičím / Vydýchej se, karusel pro obsazený stroj, texty a stavový automat (`init`, `candidates`, `go`, `logSet`, `renderVals`) |
| `Main.dc.html` | Domov s tlačítkem Začít trénink |
| `Shrnuti.dc.html` | Shrnutí po tréninku (rekordy, Garmin přes Stravu, diktovaná poznámka) |
| `Progres.dc.html`, `Detail.dc.html` | Progres a detail cviku s grafem odhadu 1RM |
| `Priprava.dc.html`, `Karta-serie3.dc.html`, `Pauza.dc.html`, `Stav-*.dc.html` | Tenké obaly, které ukazují kartu v konkrétním stavu (`variant="…"`) |

Data cviků v prototypu (`ex()` v `Karta.dc.html`) jsou ukázková. Stejný trénink je strojově v `fixtures/ukazkovy-trenink-a.json`.
