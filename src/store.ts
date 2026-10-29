import { useEffect, useState } from 'react';
import type { Product, Sample, Weights } from './types';
import { DEFAULT_WEIGHTS } from './scoring';
import { DEFAULT_FILTERS, type Filters } from './classify';
import { emptyDB, type SnapDB } from './apifyImport';
import { makeSeed } from './seed';

function useLocal<T>(key: string, init: () => T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s) as T; } catch { /* yoksay */ }
    return init();
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* yoksay */ } }, [key, v]);
  return [v, setV];
}

export function useStore() {
  const [products, setProducts] = useLocal<Product[]>('ir.products2', () => makeSeed());
  const [samples, setSamples] = useLocal<Sample[]>('ir.samples', () => []);
  const [w, setWeights] = useLocal<Weights>('ir.weights', () => DEFAULT_WEIGHTS);
  const weights = { ...DEFAULT_WEIGHTS, ...w };
  const [filters, setFilters] = useLocal<Filters>('ir.filters', () => DEFAULT_FILTERS);
  const [snap, setSnap] = useLocal<SnapDB>('ir.snap', emptyDB);
  const [watch, setWatch] = useLocal<string[]>('ir.watch', () => []);
  return { products, setProducts, samples, setSamples, weights, setWeights, watch, setWatch, filters, setFilters, snap, setSnap };
}
export type Store = ReturnType<typeof useStore>;

/** CSV (başlık satırlı) veya JSON dizisi → Product[] */
export function parseImport(text: string): Product[] {
  const t = text.trim();
  const rows: Record<string, string>[] = t.startsWith('[')
    ? JSON.parse(t)
    : (() => {
        const [h, ...ls] = t.split(/\r?\n/).filter(Boolean);
        const keys = h.split(',').map(s => s.trim());
        return ls.map(l => Object.fromEntries(l.split(',').map((c, i) => [keys[i], c.trim()])));
      })();
  const num = (v: unknown, d = 0) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v));
  return rows.map((r, i) => ({
    id: String(r.id ?? `I${Date.now()}${i}`),
    brand: (r.brand as Product['brand']) || 'Zara',
    name: String(r.name ?? 'Adsız ürün'),
    category: String(r.category ?? 'Diğer'),
    gender: (['Kadın', 'Erkek', 'Çocuk'].includes(r.gender) ? r.gender : 'Kadın') as Product['gender'],
    color: String(r.color ?? '-'), fabric: String(r.fabric ?? '-'), fit: String(r.fit ?? '-'),
    price: num(r.price), origin: String(r.origin ?? '-'),
    daysOnline: num(r.daysOnline, 7), sizesTotal: num(r.sizesTotal, 6), sizesOut: num(r.sizesOut),
    soldOutDays: r.soldOutDays === undefined || r.soldOutDays === '' || r.soldOutDays === null ? null : num(r.soldOutDays),
    restocks: num(r.restocks), markdown: num(r.markdown), adIntensity: num(r.adIntensity),
    searchTrend: num(r.searchTrend), trendDelta: num(r.trendDelta),
    history: Array.isArray(r.history) ? (r.history as unknown as number[]) : Array(12).fill(num(r.sizesOut) / Math.max(1, num(r.sizesTotal, 6)) * 100),
    image: String(r.image ?? '🧵'),
  }));
}

export const CSV_TEMPLATE =
  'id,brand,name,category,gender,color,fabric,fit,price,origin,daysOnline,sizesTotal,sizesOut,soldOutDays,restocks,markdown,adIntensity,searchTrend,trendDelta\n' +
  'Z-001,Zara,Kablo Örgü Kazak,Triko,Kadın,Ekru,%50 Yün,Oversize,39.95,Türkiye,6,6,4,3,1,0,70,65,22';
