import { mapItem } from '../server/map.js';
import { derive, record } from '../server/snap.js';
import type { Product } from './types';

export interface SnapDB { items: Record<string, { meta: Record<string, unknown>; snaps: Record<string, unknown>[] }>; syncs: { d: string; n: number }[] }
export const emptyDB = (): SnapDB => ({ items: {}, syncs: [] });

const EXCLUDE_BRANDS = ['Zara Home'];
const EXCLUDE_CATS = ['Ayakkabı & Aksesuar', 'İç Giyim'];

export interface ImportResult { db: SnapDB; products: Product[]; date: string; total: number; used: number; looks: number; soon: number; other: number; days: number }

export const fromSnap = (db: SnapDB) => derive(db) as Product[];

/** Apify'dan indirilen JSON dizisini okur, günün anlık görüntüsü olarak ekler. */
export function importApify(text: string, db: SnapDB): ImportResult {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error('Dosya bir ürün listesi değil. Apify’dan JSON olarak indirdiğinizden emin olun.');
  const all = raw.map(mapItem).filter(Boolean) as ReturnType<typeof mapItem>[];
  if (!all.length) {
    const keys = Object.keys(raw.find((r: unknown) => r && typeof r === 'object') ?? {}).slice(0, 40).join(', ');
    throw new Error(`Bu dosyanın biçimi tanınmadı. Şimdilik yalnızca “Inditex Product Scraper” çıktısı okunuyor. İlk üründeki alanlar: ${keys || '(boş dosya)'}`);
  }
  const looks = all.filter(m => m!.isLook).length;
  const soon = all.filter(m => !m!.isLook && m!.comingSoon).length;
  const keep = all.filter(m => !m!.isLook && !m!.comingSoon && !EXCLUDE_BRANDS.includes(m!.brand) && !EXCLUDE_CATS.includes(String(m!.category)));
  if (!keep.length) throw new Error(`Dosyada işinize uyan giyim ürünü yok. ${all.length} üründen ${looks} kombin, ${soon} “yakında çıkacak” ve ${all.length - looks - soon} ayakkabı/aksesuar/iç giyim/Zara Home olarak ayıklandı. Apify’da başka bir kategori seçip yeniden çalıştırın.`);
  const date = String(raw.find((r: { sourceObservedAt?: string }) => r?.sourceObservedAt)?.sourceObservedAt ?? new Date().toISOString()).slice(0, 10);
  const next: SnapDB = JSON.parse(JSON.stringify(db));
  record(next, keep, date);
  const products = derive(next, date) as Product[];
  const days = new Set(Object.values(next.items).flatMap(e => e.snaps.map(s => s.d as string))).size;
  return { db: next, products, date, total: raw.length, used: keep.length, looks, soon, other: all.length - keep.length - looks - soon, days };
}
