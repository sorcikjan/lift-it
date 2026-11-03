# Lift It: zadání a prototyp pro Claude Code

## Jak začít (3 kroky)

1. Otevři tenhle repozitář v Claude Code (na webu claude.ai/code, v mobilu nebo v desktopové appce).
2. Do `fixtures/` přidej 2–3 týdenní plány od trenéra jako CSV (návod je v `fixtures/README.md`). Klidně až později.
3. Napiš:

   > Přečti CLAUDE.md a postav fázi 1.

Claude Code si sám načte `CLAUDE.md`, ten ho navede na `docs/PRD.md` a na prototyp.

## Co je uvnitř

| Soubor | K čemu |
| --- | --- |
| `CLAUDE.md` | Pokyny pro Claude Code: zdroje pravdy, postup po fázích, pravidla obrazovky tréninku, tokeny |
| `docs/PRD.md` | Export PRD z dokumentu „PRD – Tréninková appka trenér ↔ cvičenec“ (verze 0.2) |
| `docs/prototype/` | Zdroj klikacího prototypu jako referenční specifikace |
| `fixtures/` | Ukázkový Trénink A a místo pro trenérovy CSV |

## Když se PRD změní

Uprav dokument v Claude, nech si ho znovu vyexportovat do `docs/PRD.md` a Claude Code řekni: „PRD se změnilo, projdi rozdíly a uprav plán.“
