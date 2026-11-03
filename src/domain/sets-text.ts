/**
 * Krátký zápis odcvičených sérií pro trenérův sheet (A9) a popis aktivity ve Stravě (G4).
 * Stejné série: „4 × 10, 40 kg“. Různé: „40 kg × 10, 45 kg × 10, 45 kg × 8“.
 */
import { fmtKg } from './format';
import { t } from '@/i18n/t';

export interface SetLike { reps: number | null; weight_kg: number | string | null; time_s: number | null }

const what = (s: SetLike) => (s.time_s != null && s.reps == null ? t('serie.cas', { s: s.time_s }) : String(s.reps ?? '–'));
const weight = (s: SetLike) => (s.weight_kg != null && Number(s.weight_kg) > 0 ? Number(s.weight_kg) : null);

export function setsText(sets: SetLike[]): string {
  if (!sets.length) return '';
  const first = sets[0];
  const same = sets.every((s) => what(s) === what(first) && weight(s) === weight(first));
  if (same) {
    const w = weight(first);
    return w == null ? t('serie.stejne', { n: sets.length, what: what(first) }) : t('serie.stejneVaha', { n: sets.length, what: what(first), w: fmtKg(w) });
  }
  return sets.map((s) => (weight(s) == null ? what(s) : t('serie.jednaVaha', { w: fmtKg(weight(s)!), what: what(s) }))).join(', ');
}
