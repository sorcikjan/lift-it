/**
 * Kotouče na každou stranu osy (vychytávka z PRD, Vizuální směr).
 * Čistá funkce: hladový rozklad od nejtěžšího kotouče; když váha nejde složit přesně, vrátí null.
 */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const BAR_KG = 20;

/** Soutěžní barvy kotoučů (IWF): 25 červená, 20 modrá, 15 žlutá, 10 zelená, 5 bílá, menší kov. */
export const PLATE_COLORS: Record<number, { bg: string; fg: string; h: number }> = {
  25: { bg: '#D64541', fg: '#FFFFFF', h: 56 },
  20: { bg: '#2F6FE4', fg: '#FFFFFF', h: 56 },
  15: { bg: '#E3B23C', fg: '#14171A', h: 50 },
  10: { bg: '#2FA866', fg: '#FFFFFF', h: 44 },
  5: { bg: '#F2F2F2', fg: '#14171A', h: 36 },
  2.5: { bg: '#9AA3AB', fg: '#14171A', h: 30 },
  1.25: { bg: '#C7CDD2', fg: '#14171A', h: 26 },
};

export interface PlateResult { bar: number; perSide: number[] }

export function platesPerSide(totalKg: number, barKg = BAR_KG, available: readonly number[] = PLATES_KG): PlateResult | null {
  if (!(totalKg >= barKg)) return null;
  let rest = Math.round(((totalKg - barKg) / 2) * 100) / 100;
  const perSide: number[] = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (rest + 1e-9 >= p) { perSide.push(p); rest = Math.round((rest - p) * 100) / 100; }
  }
  return rest > 1e-9 ? null : { bar: barKg, perSide };
}

/** Kotouče ukazujeme jen u cviků s olympijskou osou. */
export const usesBar = (equipment: string | null | undefined) => equipment === 'barbell';
