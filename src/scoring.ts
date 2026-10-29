import type { Product, Weights } from './types';

export const DEFAULT_WEIGHTS: Weights = { sellOut: 30, speed: 20, ads: 12, search: 10, restock: 10, fullPrice: 10, fresh: 8 };

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  sellOut: 'Beden tükenme oranı', speed: 'Tükenme hızı', ads: 'Reklam yoğunluğu',
  search: 'Arama trendi', restock: 'Yeniden stok', fullPrice: 'İndirimsiz satış', fresh: 'Yenilik',
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function signals(p: Product): Record<keyof Weights, number> {
  return {
    sellOut: clamp((p.sizesOut / p.sizesTotal) * 100),
    speed: p.soldOutDays === null ? 0 : clamp(100 - (p.soldOutDays / 14) * 100),
    ads: clamp(p.adIntensity),
    search: clamp(p.searchTrend * 0.7 + Math.max(0, p.trendDelta) * 0.6),
    restock: clamp(p.restocks * 35),
    fullPrice: clamp(100 - p.markdown * 250),
    fresh: clamp(100 - (p.daysOnline / 60) * 100),
  };
}

export function score(p: Product, w: Weights): number {
  const s = signals(p);
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  let sum = 0;
  (Object.keys(w) as (keyof Weights)[]).forEach(k => (sum += s[k] * w[k]));
  return Math.round(sum / total);
}

export type Verdict = { label: string; tone: 'hot' | 'warm' | 'cool' | 'cold' };
export function verdict(sc: number, p: Product): Verdict {
  if (p.markdown >= 0.3) return { label: 'Düşük talep', tone: 'cold' };
  if (sc >= 70) return { label: 'Acil fırsat', tone: 'hot' };
  if (sc >= 55) return { label: 'Güçlü aday', tone: 'warm' };
  if (sc >= 40) return { label: 'İzle', tone: 'cool' };
  return { label: 'Düşük talep', tone: 'cold' };
}

/** Tükenmeye ne kadar kaldı (tahmini gün). */
export function stockoutEta(p: Product): string {
  if (p.sizesOut >= p.sizesTotal) return 'Tükendi';
  if (p.sizesOut === 0 || p.daysOnline === 0) return '—';
  const rate = p.sizesOut / Math.max(1, p.daysOnline);
  const days = Math.ceil((p.sizesTotal - p.sizesOut) / rate);
  return days > 45 ? '45+ gün' : `~${days} gün`;
}

export interface AttrStat { key: string; n: number; avg: number }
export function groupAvg(items: Product[], w: Weights, pick: (p: Product) => string): AttrStat[] {
  const m = new Map<string, number[]>();
  items.forEach(p => { const k = pick(p); m.set(k, [...(m.get(k) ?? []), score(p, w)]); });
  return [...m].map(([key, a]) => ({ key, n: a.length, avg: Math.round(a.reduce((x, y) => x + y, 0) / a.length) }))
    .sort((a, b) => b.avg - a.avg);
}
