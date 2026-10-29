export type Brand = 'Zara' | 'Bershka' | 'Pull&Bear' | 'Stradivarius' | 'Massimo Dutti' | 'Oysho';

export interface Product {
  id: string;
  brand: Brand | string;
  name: string;
  category: string;
  gender: 'Kadın' | 'Erkek' | 'Çocuk';
  color: string;
  fabric: string;
  fit: string;
  price: number;           // EUR
  origin: string;          // ürün sayfasındaki "Made in"
  daysOnline: number;      // koleksiyona giriş yaşı
  sizesTotal: number;
  sizesOut: number;        // şu an tükenmiş beden sayısı
  soldOutDays: number | null; // ilk bedenin tükenmesine kadar geçen gün
  restocks: number;        // yeniden stoklanma sayısı
  markdown: number;        // 0..1 indirim oranı
  adIntensity: number;     // 0..100 (Meta Ad Library / sosyal öne çıkarma)
  searchTrend: number;     // 0..100 (Google/Pinterest Trends)
  trendDelta: number;      // son 4 hafta değişim %
  history: number[];       // son 12 hafta "tükenme oranı" 0..100
  image: string;           // emoji/ikon yer tutucu
  imageUrl?: string;       // ürün fotoğrafı (canlı veri)
  demo?: boolean;
}

export interface Weights {
  sellOut: number; speed: number; ads: number; search: number; restock: number; fullPrice: number; fresh: number; fit: number;
}

export type SampleStatus = 'Hazırlanıyor' | 'Gönderildi' | 'Onaylandı' | 'Reddedildi';

export interface Sample {
  id: string;
  refId: string;           // ilham alınan ürün
  brand: Brand | string;
  title: string;
  category: string;
  score: number;
  status: SampleStatus;
  createdAt: string;
  note: string;
  attrs: { color: string; fabric: string; fit: string };
}
