import type { Brand, Product } from './types';

// Deterministik sahte veri üretici. GERÇEK VERİ DEĞİLDİR; gerçek veriyi "İçe Aktar" sekmesinden yükleyin.
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

const BRANDS: Brand[] = ['Zara', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Massimo Dutti', 'Oysho'];
const CATS: { cat: string; icon: string; items: string[]; gender: 'Kadın' | 'Erkek'; fabrics: string[] }[] = [
  { cat: 'Triko', icon: '🧶', items: ['Kablo Örgü Kazak', 'Yarım Fermuarlı Triko', 'Balıkçı Yaka Kazak', 'Fitilli Örme Kazak'], gender: 'Kadın', fabrics: ['%50 Yün %50 Akrilik', '%100 Pamuk', 'Viskon Karışım'] },
  { cat: 'Hırka', icon: '🧥', items: ['Oversize Örgü Hırka', 'Kısa Triko Hırka', 'Uzun Penye Hırka'], gender: 'Kadın', fabrics: ['%60 Pamuk %40 Akrilik', 'Viskon Elastan', '%100 Pamuk'] },
  { cat: 'Yelek', icon: '🦺', items: ['Örgü Yelek', 'Şişme Yelek', 'Kürk Efektli Yelek'], gender: 'Kadın', fabrics: ['Akrilik Karışım', 'Polyester', 'Pamuk Elastan'] },
  { cat: 'Ceket & Mont', icon: '🧥', items: ['Deri Efektli Bomber', 'Oversize Blazer', 'Şişme Mont', 'Trençkot', 'Örme Kumaş Ceket', 'Peluş Kaban'], gender: 'Kadın', fabrics: ['Poliüretan', '%100 Polyester', 'Pamuk Gabardin'] },
  { cat: 'Pantolon', icon: '👖', items: ['Wide Leg Pantolon', 'Kargo Pantolon', 'Paraşüt Pantolon', 'Pileli Pantolon'], gender: 'Erkek', fabrics: ['%100 Pamuk', 'Naylon', 'Polyester Viskon'] },
  { cat: 'Denim', icon: '🩳', items: ['Baggy Jean', 'Straight Fit Jean', 'Denim Ceket', 'Mom Fit Jean'], gender: 'Kadın', fabrics: ['%100 Pamuk Denim', 'Elastanlı Denim'] },
  { cat: 'Gömlek', icon: '👔', items: ['Poplin Gömlek', 'Keten Gömlek', 'Oversize Gömlek', 'Çizgili Gömlek'], gender: 'Erkek', fabrics: ['%100 Keten', 'Pamuk Poplin', 'Viskon'] },
  { cat: 'Elbise', icon: '👗', items: ['Saten Midi Elbise', 'Çiçekli Elbise', 'Triko Elbise', 'Poplin Mini Elbise'], gender: 'Kadın', fabrics: ['Saten', 'Viskon', 'Pamuk Poplin'] },
  { cat: 'Tişört', icon: '👕', items: ['Grafik Baskılı Tişört', 'Boxy Tişört', 'Kolsuz Atlet', 'Ribana Crop Tişört'], gender: 'Erkek', fabrics: ['%100 Pamuk', 'Pamuk Elastan'] },
  { cat: 'Sweatshirt', icon: '🧢', items: ['Kapüşonlu Sweatshirt', 'Fermuarlı Hoodie', 'Vintage Yıkamalı Sweat'], gender: 'Erkek', fabrics: ['%100 Pamuk Şardonlu', 'Pamuk Polyester'] },
  { cat: 'Etek', icon: '🪭', items: ['Mini Etek', 'Midi Saten Etek', 'Denim Etek'], gender: 'Kadın', fabrics: ['Saten', 'Denim', 'Polyester'] },
  { cat: 'Takım & Set', icon: '🧵', items: ['Kumaş Takım Elbise', 'Eşofman Takımı', 'Keten Set'], gender: 'Erkek', fabrics: ['Yün Karışım', 'Pamuk', 'Keten'] },
];
const COLORS = ['Ekru', 'Siyah', 'Haki', 'Bordo', 'Taba', 'Gri Melanj', 'Çikolata', 'Lacivert', 'Buz Mavisi', 'Antrasit'];
const FITS = ['Oversize', 'Regular', 'Relaxed', 'Slim', 'Boxy', 'Wide Leg'];
const ORIGINS = ['Türkiye', 'Türkiye', 'Türkiye', 'Fas', 'Fas', 'Portekiz', 'Çin', 'Bangladeş', 'Hindistan', 'Vietnam', 'Mısır', 'Pakistan'];

export function makeSeed(n = 90): Product[] {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return Array.from({ length: n }, (_, i) => {
    const c = pick(CATS);
    const hot = r() < 0.3; // ürünlerin bir kısmı gerçekten "çok satan"
    const daysOnline = Math.floor(2 + r() * 55);
    const sizesTotal = 6;
    const sizesOut = hot ? 3 + Math.floor(r() * 4) : Math.floor(r() * 3);
    const base = hot ? 55 + r() * 40 : 5 + r() * 45;
    const history = Array.from({ length: 12 }, (_, k) => Math.round(Math.min(100, Math.max(0, (hot ? k * 7 : k * 2) + base * 0.4 + r() * 15))));
    return {
      id: `D${1000 + i}`,
      brand: pick(BRANDS),
      name: pick(c.items),
      category: c.cat,
      gender: (() => { const g = r(); return c.cat === 'Ceket & Mont' || c.cat === 'Hırka' || c.cat === 'Yelek' ? (g < 0.75 ? 'Kadın' : g < 0.92 ? 'Erkek' : 'Çocuk') : (g < 0.5 ? 'Kadın' : g < 0.85 ? 'Erkek' : 'Çocuk'); })() as Product['gender'],
      color: pick(COLORS),
      fabric: pick(c.fabrics),
      fit: pick(FITS),
      price: Math.round((14 + r() * 90) * 100) / 100,
      origin: pick(ORIGINS),
      daysOnline,
      sizesTotal,
      sizesOut: Math.min(sizesTotal, sizesOut),
      soldOutDays: sizesOut > 0 ? Math.max(1, Math.floor(r() * (hot ? 8 : 25))) : null,
      restocks: hot ? Math.floor(r() * 3) : r() < 0.1 ? 1 : 0,
      markdown: hot ? 0 : r() < 0.35 ? [0.15, 0.3, 0.5][Math.floor(r() * 3)] : 0,
      adIntensity: Math.round(hot ? 45 + r() * 55 : r() * 60),
      searchTrend: Math.round(hot ? 50 + r() * 50 : r() * 60),
      trendDelta: Math.round((hot ? 5 + r() * 50 : -20 + r() * 35)),
      history,
      image: c.icon,
      demo: true,
    };
  });
}
