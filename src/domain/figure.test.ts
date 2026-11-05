import { describe, expect, it } from 'vitest';
import { figureFor } from './figure';

describe('Postava cviku podle názvu', () => {
  it.each([
    ['Lat pulldown - menší nástavec', 'lat'],
    ['Lying Medicine Ball Pullover', 'po'],
    ['Seated Thoracic Rotation with Medicine Ball', 'tr'],
    ['Shoulder press DB', 'sp'],
    ['Leg press', 'lp'],
    ['Zakopávání na stroji', 'lc'],
    ['Dumbbell Y Raise on Incline Bench', 'yr'],
    ['Seated cable row - V adapter', 'row'],
    ['Plank', 'pl'],
    ['Tlak na prsa', 'bp'],
    ['Přítahy horní kladky', 'lat'],
    ['Dřep s osou', 'sq'],
    ['Bicepsový zdvih', 'cu'],
    ['Rotoped', 'stand'],
  ])('„%s“ → %s', (n, k) => expect(figureFor(n)).toBe(k));
  it('pozná cvik i podle id z knihovny', () => expect(figureFor('Veslo', 'Seated_Cable_Rows')).toBe('row'));
});
