/**
 * Animovaná postava cviku (nový design): podle názvu a id cviku vybere pohybový vzor.
 * Vzorů je pár, pokrývají běžné cviky z posilovny; neznámý cvik dostane klidnou postavu.
 */
import { normalizeName } from '@/lib/normalize';

export type FigureKind = 'lat' | 'po' | 'tr' | 'lp' | 'sq' | 'lc' | 'sp' | 'yr' | 'row' | 'pl' | 'bp' | 'cu' | 'stand';

const RULES: [FigureKind, RegExp][] = [
  ['po', /pullover|pretahovani/],
  ['tr', /rotation|rotace|twist|russian/],
  ['lat', /pulldown|pull ?up|chin ?up|shyb|stahovani|horni kladk|lat /],
  ['lp', /leg press|legpress/],
  ['lc', /leg curl|zakopavani|hamstring curl|lying leg curls|seated leg curl/],
  ['sp', /shoulder press|overhead|military|nad hlavu|tlaky? na ramena|arnold/],
  ['yr', /raise|upazovani|predpazovani|rozpazovani|y raise/],
  ['row', /row|veslovani|pritah/],
  ['pl', /plank|prkno/],
  ['bp', /bench|chest press|tlak na prsa|benchpress|kliky|push ?up/],
  ['cu', /curl|bicep|zdvih/],
  ['sq', /squat|drep|lunge|vypad|deadlift|mrtvy tah|leg extension|predkopavani|hip thrust|glute/],
];

export function figureFor(name: string, exerciseId = ''): FigureKind {
  const n = ` ${normalizeName(`${name} ${exerciseId.replace(/[_-]/g, ' ')}`)} `;
  for (const [k, re] of RULES) if (re.test(n)) return k;
  return 'stand';
}
