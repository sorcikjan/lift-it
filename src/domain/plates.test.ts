import { describe, expect, it } from 'vitest';
import { platesPerSide, usesBar } from './plates';

describe('kotouče na každou stranu', () => {
  it('40 kg = osa + 10 na každou stranu (příklad z PRD)', () => expect(platesPerSide(40)).toEqual({ bar: 20, perSide: [10] }));
  it('20 kg = jen osa', () => expect(platesPerSide(20)).toEqual({ bar: 20, perSide: [] }));
  it('102,5 kg = 25 + 15 + 1,25', () => expect(platesPerSide(102.5)).toEqual({ bar: 20, perSide: [25, 15, 1.25] }));
  it('62,5 kg = 20 + 1,25', () => expect(platesPerSide(62.5)).toEqual({ bar: 20, perSide: [20, 1.25] }));
  it('197,5 kg = 3 × 25 + 10 + 2,5 + 1,25', () => expect(platesPerSide(197.5)?.perSide).toEqual([25, 25, 25, 10, 2.5, 1.25]));
  it('lehčí než osa nebo nesložitelná váha = null', () => {
    expect(platesPerSide(15)).toBeNull();
    expect(platesPerSide(21)).toBeNull();
  });
  it('jiná osa (EZ 10 kg)', () => expect(platesPerSide(30, 10)).toEqual({ bar: 10, perSide: [10] }));
  it('jen u osy', () => {
    expect(usesBar('barbell')).toBe(true);
    expect(usesBar('machine')).toBe(false);
    expect(usesBar(null)).toBe(false);
  });
});
