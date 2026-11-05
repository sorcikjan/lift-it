# Fixtury

Skutečné plány od trenéra. Trenér posílá každý trénink jako zvláštní soubor **XLSX** v mailu.

- `trenink-2.xlsx`: Trénink 2 (listopad 2026). Jeden list, cviky od řádku 4: název ve sloupci C (u superserie označení A1/A2 v C a název v D, sloučené buňky C–F),
  série × opakování v G („3x9-10“, „2x1min“), váha v H („32,5 kg“), poznámka v I. Bez hlavičky.

Další soubory (Trénink 1, další týdny) sem patří se stejným názvem `trenink-N.xlsx`; test `src/domain/plan/xlsx.test.ts` je načítá.
`ukazkovy-trenink-a.json` je ukázkový trénink pro domov bez plánu.
