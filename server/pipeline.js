// Ham aktör çıktısını (satır başına ürün) eşleştirir ve işimize yaramayanları ayıklar.
import { mapItem } from './map.js';

const EXCLUDE_BRANDS = ['Zara Home'];
const EXCLUDE_CATS = ['Ayakkabı & Aksesuar', 'İç Giyim'];

export function prepare(raw) {
  if (!Array.isArray(raw)) throw new Error('Aktör çıktısı bir liste değil');
  const all = raw.map(mapItem).filter(Boolean);
  const looks = all.filter(m => m.isLook).length;
  const soon = all.filter(m => !m.isLook && m.comingSoon).length;
  const keep = all.filter(m => !m.isLook && !m.comingSoon && !EXCLUDE_BRANDS.includes(m.brand) && !EXCLUDE_CATS.includes(m.category));
  const date = String(raw.find(r => r?.sourceObservedAt || r?.scrapedAt)?.sourceObservedAt ?? raw.find(r => r?.scrapedAt)?.scrapedAt ?? new Date().toISOString()).slice(0, 10);
  return { keep, date, stats: { total: raw.length, used: keep.length, looks, soon, other: all.length - keep.length - looks - soon, unmapped: raw.length - all.length } };
}
