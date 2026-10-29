import type { Product } from './types';

export type Knit = 'kesin' | 'olası' | 'dokuma';
export const GROUPS = ['Dış Giyim', 'Üst Giyim', 'Alt Giyim', 'Elbise & Takım', 'Diğer'] as const;
export type Group = (typeof GROUPS)[number];
export const GENDERS = ['Kadın', 'Erkek', 'Çocuk'] as const;

const GROUP_OF: Record<string, Group> = {
  'Ceket & Mont': 'Dış Giyim', 'Hırka': 'Dış Giyim', 'Yelek': 'Dış Giyim',
  'Triko': 'Üst Giyim', 'Sweatshirt': 'Üst Giyim', 'Tişört': 'Üst Giyim', 'Gömlek': 'Üst Giyim',
  'Pantolon': 'Alt Giyim', 'Denim': 'Alt Giyim', 'Etek': 'Alt Giyim',
  'Elbise': 'Elbise & Takım', 'Takım & Set': 'Elbise & Takım',
};
export const groupOf = (p: Product): Group => GROUP_OF[p.category] ?? 'Diğer';

// Örme/penye tahmini. Marka siteleri "örme" bilgisini vermez; kategori, ürün adı ve kumaş içeriğinden çıkarılır.
const KNIT_CATS = ['Triko', 'Hırka', 'Sweatshirt', 'Tişört'];
const KNIT_WORDS = /knit|jersey|rib|fleece|polo|penye|interlock|pique|piqu[eé]|strick|maglia|punto|örgü|örme|kablo|triko|sweat|hoodie|cardigan|hırka|bouclé|boucle|teddy|waffle/i;
const STRETCH = /elast|lycra|spandex/i;

export function knitOf(p: Product): Knit {
  const text = `${p.name} ${p.category} ${p.fabric}`;
  if (p.category === 'Denim') return 'dokuma';
  if (KNIT_CATS.includes(p.category) || KNIT_WORDS.test(text)) return 'kesin';
  if (STRETCH.test(p.fabric) && ['Elbise', 'Etek', 'Pantolon', 'Yelek', 'Takım & Set'].includes(p.category)) return 'olası';
  return 'dokuma';
}
export const isKnit = (p: Product) => knitOf(p) !== 'dokuma';

/** Firmanın üretim profiline uyum (0–100): örme/penye, kadın, dış giyim. */
export function fitMatch(p: Product): number {
  const k = knitOf(p) === 'kesin' ? 50 : knitOf(p) === 'olası' ? 30 : 0;
  const g = p.gender === 'Kadın' ? 25 : p.gender === 'Erkek' ? 12 : 8;
  const gr = groupOf(p);
  const t = gr === 'Dış Giyim' ? 25 : gr === 'Üst Giyim' ? 15 : gr === 'Elbise & Takım' ? 10 : 5;
  return k + g + t;
}

export interface Filters { gender: 'Hepsi' | (typeof GENDERS)[number]; knit: boolean; group: 'Hepsi' | Group }
export const FOCUS: Filters = { gender: 'Kadın', knit: true, group: 'Dış Giyim' };
export const ALL: Filters = { gender: 'Hepsi', knit: false, group: 'Hepsi' };
export const DEFAULT_FILTERS: Filters = { gender: 'Kadın', knit: true, group: 'Hepsi' };

export const passes = (p: Product, f: Filters) =>
  (f.gender === 'Hepsi' || p.gender === f.gender) && (!f.knit || isKnit(p)) && (f.group === 'Hepsi' || groupOf(p) === f.group);
