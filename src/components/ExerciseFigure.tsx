'use client';
/**
 * Animovaná postava cviku (nový design). Dvě pózy (začátek, konec pohybu), mezi nimi
 * plynulý pohyb tam a zpět přes SVG <animate>, takže nic nepočítá JavaScript na každý snímek.
 * Prefers-reduced-motion: postava stojí v polovině pohybu.
 */
import { useEffect, useState } from 'react';
import type { FigureKind } from '@/domain/figure';

type Pt = [number, number];
type Pose = Record<'h' | 'n' | 'p' | 'k' | 'f' | 'e' | 'w', Pt>;
type El = [tag: 'line' | 'rect' | 'circle', cls: string, attrs: Record<string, number | string>];
interface Fig { s: Pose; e: Pose; eq: (q: Pose) => El[] }

const line = (cls: string, x1: number, y1: number, x2: number, y2: number, extra: Record<string, number | string> = {}): El => ['line', cls, { x1, y1, x2, y2, ...extra }];
const bench = (x1: number, x2: number, y: number, legs: number[]): El[] => [line('eq', x1, y, x2, y), ...legs.map((x) => line('eq', x, y, x, 140))];
const stand: Pose = { h: [120, 30], n: [120, 47], p: [120, 92], k: [121, 116], f: [122, 140], e: [123, 70], w: [125, 94] };

const FIGS: Record<FigureKind, Fig> = {
  lat: { eq: (q) => [...bench(70, 140, 112, [80]), line('acc-s', q.w[0], 0, q.w[0], q.w[1], { opacity: 0.5 }), ['rect', 'acc', { x: q.w[0] - 22, y: q.w[1] - 4, width: 44, height: 8, rx: 4 }]],
    s: { h: [104, 44], n: [106, 62], p: [110, 108], k: [145, 110], f: [150, 140], e: [116, 34], w: [122, 10] },
    e: { h: [100, 46], n: [104, 64], p: [110, 108], k: [145, 110], f: [150, 140], e: [92, 92], w: [116, 68] } },
  sp: { eq: (q) => [...bench(80, 140, 112, [86]), ['rect', 'acc', { x: q.w[0] - 12, y: q.w[1] - 5, width: 24, height: 10, rx: 4 }]],
    s: { h: [108, 44], n: [108, 62], p: [110, 108], k: [145, 110], f: [150, 140], e: [128, 80], w: [124, 56] },
    e: { h: [108, 44], n: [108, 62], p: [110, 108], k: [145, 110], f: [150, 140], e: [120, 40], w: [114, 14] } },
  lp: { eq: (q) => [line('eq', 28, 80, 86, 114), line('eq', 60, 104, 60, 140), line('acc-s', q.f[0] + 8, q.f[1] - 26, q.f[0] + 8, q.f[1] + 22, { 'stroke-width': 9 }), line('eq', q.f[0] + 8, q.f[1], 230, q.f[1] - 20, { opacity: 0.5 })],
    s: { h: [34, 62], n: [46, 76], p: [80, 104], k: [104, 70], f: [130, 88], e: [64, 98], w: [80, 108] },
    e: { h: [34, 62], n: [46, 76], p: [80, 104], k: [124, 96], f: [168, 90], e: [64, 98], w: [80, 108] } },
  lc: { eq: (q) => [...bench(36, 196, 110, [60, 176]), ['circle', 'acc', { cx: q.f[0], cy: q.f[1] - 6, r: 9 }]],
    s: { h: [40, 90], n: [58, 96], p: [118, 98], k: [160, 99], f: [202, 99], e: [66, 112], w: [84, 110] },
    e: { h: [40, 90], n: [58, 96], p: [118, 98], k: [160, 99], f: [178, 56], e: [66, 112], w: [84, 110] } },
  yr: { eq: (q) => [line('eq', 72, 132, 150, 66), line('eq', 96, 112, 96, 140), ['rect', 'acc', { x: q.w[0] - 9, y: q.w[1] - 5, width: 18, height: 10, rx: 4 }]],
    s: { h: [150, 54], n: [138, 66], p: [86, 112], k: [64, 128], f: [62, 140], e: [144, 92], w: [146, 116] },
    e: { h: [150, 54], n: [138, 66], p: [86, 112], k: [64, 128], f: [62, 140], e: [162, 50], w: [184, 32] } },
  row: { eq: (q) => [line('eq', 70, 122, 130, 122), line('eq', 176, 96, 176, 134), line('acc-s', q.w[0], q.w[1], 216, 92, { opacity: 0.6 }), ['circle', 'acc', { cx: q.w[0], cy: q.w[1], r: 7 }]],
    s: { h: [104, 52], n: [100, 70], p: [96, 116], k: [134, 98], f: [170, 116], e: [126, 80], w: [152, 88] },
    e: { h: [96, 54], n: [94, 72], p: [96, 116], k: [134, 98], f: [170, 116], e: [76, 88], w: [106, 94] } },
  pl: { eq: () => [],
    s: { h: [176, 84], n: [160, 96], p: [100, 102], k: [62, 108], f: [26, 116], e: [160, 126], w: [186, 128] },
    e: { h: [176, 86], n: [160, 98], p: [100, 108], k: [62, 111], f: [26, 116], e: [160, 126], w: [186, 128] } },
  tr: { eq: (q) => [['circle', 'acc', { cx: q.w[0], cy: q.w[1], r: 11 }]],
    s: { h: [110, 62], n: [110, 80], p: [112, 126], k: [148, 118], f: [162, 136], e: [132, 96], w: [146, 90] },
    e: { h: [106, 62], n: [108, 80], p: [112, 126], k: [148, 118], f: [162, 136], e: [88, 96], w: [74, 90] } },
  po: { eq: (q) => [line('eq', 30, 120, 210, 120), ['circle', 'acc', { cx: q.w[0], cy: q.w[1], r: 11 }]],
    s: { h: [50, 102], n: [68, 108], p: [130, 110], k: [160, 84], f: [186, 112], e: [72, 82], w: [74, 58] },
    e: { h: [50, 102], n: [68, 108], p: [130, 110], k: [160, 84], f: [186, 112], e: [46, 98], w: [22, 100] } },
  bp: { eq: (q) => [...bench(56, 160, 112, [70, 150]), line('acc-s', q.w[0] - 2, q.w[1] - 14, q.w[0] - 2, q.w[1] + 14, { 'stroke-width': 7 })],
    s: { h: [70, 98], n: [86, 103], p: [140, 104], k: [176, 106], f: [184, 140], e: [104, 122], w: [100, 92] },
    e: { h: [70, 98], n: [86, 103], p: [140, 104], k: [176, 106], f: [184, 140], e: [94, 74], w: [92, 48] } },
  cu: { eq: (q) => [['rect', 'acc', { x: q.w[0] - 6, y: q.w[1] - 10, width: 12, height: 20, rx: 4 }]],
    s: { ...stand, e: [124, 72], w: [126, 98] },
    e: { ...stand, e: [124, 72], w: [144, 56] } },
  sq: { eq: (q) => [line('acc-s', q.w[0] - 24, q.w[1], q.w[0] + 24, q.w[1], { 'stroke-width': 7 })],
    s: { h: [120, 30], n: [120, 47], p: [120, 92], k: [121, 116], f: [122, 140], e: [134, 58], w: [126, 48] },
    e: { h: [114, 54], n: [110, 70], p: [96, 112], k: [128, 116], f: [122, 140], e: [124, 80], w: [116, 71] } },
  stand: { eq: () => [], s: stand, e: { ...stand, h: [120, 31], e: [126, 69], w: [130, 92] } },
};

const fmt = (p: Pt) => `${p[0]},${p[1]}`;
const DUR = '2.8s';
const SPLINE = { calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1', dur: DUR, repeatCount: 'indefinite' } as const;
const mid = (a: Pose, b: Pose): Pose => Object.fromEntries(Object.keys(a).map((k) => [k, [(a[k as keyof Pose][0] + b[k as keyof Pose][0]) / 2, (a[k as keyof Pose][1] + b[k as keyof Pose][1]) / 2]])) as Pose;

function Anim({ attr, from, to, still }: { attr: string; from: string | number; to: string | number; still: boolean }) {
  if (still || String(from) === String(to)) return null;
  return <animate attributeName={attr} values={`${from};${to};${from}`} {...SPLINE} />;
}

function Shape({ a, b, still }: { a: El; b: El; still: boolean }) {
  const [tag, cls, attrs] = a;
  const Tag = tag;
  return (
    <Tag className={cls} {...attrs}>
      {Object.keys(attrs).map((k) => <Anim key={k} attr={k} from={attrs[k]} to={b[2][k]} still={still} />)}
    </Tag>
  );
}

export function ExerciseFigure({ kind, className = '', label }: { kind: FigureKind; className?: string; label?: string }) {
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  const F = FIGS[kind] ?? FIGS.stand;
  const s = still ? mid(F.s, F.e) : F.s;
  const e = still ? s : F.e;
  const legs = (q: Pose) => `${fmt(q.n)} ${fmt(q.p)} ${fmt(q.k)} ${fmt(q.f)}`;
  const arms = (q: Pose) => `${fmt(q.n)} ${fmt(q.e)} ${fmt(q.w)}`;
  const eqS = F.eq(s), eqE = F.eq(e);
  return (
    <svg className={`fig ${className}`} viewBox="0 0 240 150" preserveAspectRatio="xMidYMid meet" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-figure={kind}>
      <line className="floor" x1="10" y1="141" x2="230" y2="141" />
      {eqS.map((el, i) => <Shape key={i} a={el} b={eqE[i]} still={still} />)}
      <polyline className="body" points={legs(s)}><Anim attr="points" from={legs(s)} to={legs(e)} still={still} /></polyline>
      <polyline className="body" points={arms(s)}><Anim attr="points" from={arms(s)} to={arms(e)} still={still} /></polyline>
      <circle className="head" cx={s.h[0]} cy={s.h[1]} r="12">
        <Anim attr="cx" from={s.h[0]} to={e.h[0]} still={still} />
        <Anim attr="cy" from={s.h[1]} to={e.h[1]} still={still} />
      </circle>
    </svg>
  );
}
