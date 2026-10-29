// sian.agency/inditex-product-scraper çıktısını (satır başına bir ürün) ortak biçime çevirir.
// Şema, 29.10.2026 tarihli gerçek bir örnek çıktıdan (overview modu, DE mağazası) çıkarıldı.
//
// Önemli gözlemler:
//  - Zara'nın overview çıktısında beden (variants) ve kumaş yok; yalnızca ürün düzeyinde availability var.
//    Beden bazlı Zara verisi için aktörün "detail" modu gerekir.
//  - Diğer markalarda variants[] var: size, is_buyable, back_soon, origin (üretim ülkesi, Almanca).
//  - variants[].back_soon=true bedenin şu an satışta olmadığı ve geri geleceği anlamına GELDİĞİ VARSAYILDI.
//    (COMING_SOON ürünlerde tüm bedenler true olduğu için bu ürünler stok hesabından çıkarılır.)
//    Bu varsayım birkaç gün gözlemle doğrulanmalı.

const BRAND = { zara: 'Zara', bershka: 'Bershka', pullandbear: 'Pull&Bear', stradivarius: 'Stradivarius', massimodutti: 'Massimo Dutti', oysho: 'Oysho', zarahome: 'Zara Home' };

// Almanca (DE mağazası) üretim ülkesi → Türkçe
const ORIGIN = [
  [/TÜRK|TURK|TURQU/i, 'Türkiye'], [/MAROK|MAROC|MOROC/i, 'Fas'], [/PORTUG/i, 'Portekiz'], [/SPAN|ESPA/i, 'İspanya'],
  [/CHINA/i, 'Çin'], [/BANGLA/i, 'Bangladeş'], [/INDIEN|INDIA/i, 'Hindistan'], [/VIETNAM/i, 'Vietnam'],
  [/ÄGYPT|AEGYPT|EGYPT/i, 'Mısır'], [/PAKISTAN/i, 'Pakistan'], [/KAMBODSCH|CAMBOD/i, 'Kamboçya'],
  [/^LK$|SRI ?LANKA/i, 'Sri Lanka'], [/INDONES/i, 'Endonezya'], [/MYANMAR|BIRMA/i, 'Myanmar'],
];
export const originTR = o => (o ? (ORIGIN.find(([re]) => re.test(o))?.[1] ?? o) : '-');

// Ürün ailesi (İng./Alm./İsp. karışık) → uygulamanın Türkçe kategorileri
const CAT = [
  [/shoe|boot|sneaker|trainer|bambas|calzado|zapato|flats|blucher|derby|loafer|mule|sandal|jewel|\bcap\b|sock|\bbag|belt|scarf|hat\b|glove/i, 'Ayakkabı & Aksesuar'],
  [/\bbra\b|underwear|lingerie|brief|pyjama|pajama/i, 'İç Giyim'],
  [/cardigan|hırka|strickjacke|cardi\b/i, 'Hırka'], [/\bvest|gilet|waistcoat|weste/i, 'Yelek'],
  [/knit|sweater|jersey|pullover|strick|triko/i, 'Triko'], [/sweat|hoodie/i, 'Sweatshirt'],
  [/denim|jean/i, 'Denim'], [/coat|jacket|bomber|blazer|outwear|parka|anorak|mantel|jacke|puffer|trench/i, 'Ceket & Mont'],
  [/trouser|pant|legging|jogger|cargo/i, 'Pantolon'], [/t[\s-]?shirt|\btee\b|\btops?\b|tank|bodysuit|polo/i, 'Tişört'],
  [/shirt|blouse|bluse|hemd/i, 'Gömlek'], [/dress|kleid|jumpsuit/i, 'Elbise'], [/skirt|rock/i, 'Etek'],
  [/suit|set|co-?ord|tracksuit/i, 'Takım & Set'],
];
export const matchCat = fam => CAT.find(([re]) => re.test(String(fam ?? '').replace(/Â/g, ' ')))?.[1] ?? null;
export const categoryTR = fam => {
  const f = String(fam ?? '').replace(/Â/g, ' ');
  return CAT.find(([re]) => re.test(f))?.[1] ?? (f ? f.charAt(0) + f.slice(1).toLowerCase() : 'Diğer');
};

const compositionText = c =>
  Array.isArray(c) && c.length
    ? c[0].composition?.map(x => `%${x.percentage} ${x.name}`).join(', ') ?? '-'
    : '-';

const mostCommon = arr => {
  const m = new Map(); arr.filter(Boolean).forEach(x => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
};

/** 'in' | 'low' | 'out' */
export function stockState(v) {
  const s = String(v ?? '').toLowerCase();
  if (/(out|sold|unavail|agotad|no[_ -]?stock)/.test(s)) return 'out';
  if (/(low|last|few|limited)/.test(s)) return 'low';
  return 'in';
}

const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : null; };

// "OUTER SHELL: 63% viscose, 37% polyester | LINING: 100% polyester" → "%63 viscose, %37 polyester"
function fabricFromString(s) {
  const parts = String(s ?? '').split('|').map(x => x.trim()).filter(Boolean);
  const outer = parts.find(p => !/^LINING|^Not Disclosed/i.test(p)) ?? '';
  const txt = outer.replace(/^[A-Z ]+:\s*/, '').replace(/(\d+)%/g, '%$1');
  return txt || '-';
}

/** Zara Scraper (productId, sizes[].demand, releaseDate alanlı) çıktısı: en zengin biçim. */
function mapZaraScraper(raw) {
  if (raw.error) return null;
  const sec = String(raw.section ?? '');
  const last = String(raw.categoryPath ?? '').split('>').pop();
  const sizes = raw.sizes.map(s => ({ size: String(s.size), state: stockState(s.availability) }));
  const demands = raw.sizes.map(s => String(s.demand ?? '')).filter(Boolean);
  const rank = d => (/HIGH|PEAK|HOT/i.test(d) ? 2 : /LOW/i.test(d) ? 0 : 1);
  const demand = demands.sort((a, b) => rank(b) - rank(a))[0];
  return {
    id: `zara:${raw.productId}`,
    brand: 'Zara',
    name: raw.name ?? `Ürün ${raw.displayReference}`,
    category: matchCat(last) ?? categoryTR([raw.family, raw.subfamily, raw.name].filter(Boolean).join(' ')),
    gender: /KID|BOY|GIRL|BABY|CHILD|NI[ÑN]/i.test(sec) ? 'Çocuk' : /^MAN|^MEN|HOMBRE/i.test(sec) ? 'Erkek' : 'Kadın',
    color: raw.colorName ?? '-',
    composition: fabricFromString(raw.composition),
    origin: '-',
    price: num(raw.price),
    originalPrice: num(raw.oldPrice),
    currency: raw.currency ?? 'EUR',
    launched: raw.releaseDate ? String(raw.releaseDate).slice(0, 10) : null,
    rank: null,
    demand,
    comingSoon: /coming/i.test(String(raw.availability)),
    isLook: false,
    sizes,
    image: String(raw.imageUrl ?? raw.imageUrls?.[0] ?? '').replace(/w=\d+/, 'w=400'),
  };
}

/** rl1987/zara-api-scraper çıktısı (Zara'ya özel). Detay modu (PDP) kapalıysa beden, kumaş ve menşe gelmez. */
function mapZaraApi(raw) {
  const img = raw.colors?.flatMap(c => c.images ?? []).find(Boolean);
  const state = stockState(raw.availability);
  const price = typeof raw.price === 'number' ? raw.price : null;
  const fam = [raw.family_name, raw.subfamily_name, raw.name].filter(Boolean).join(' ');
  const sec = String(raw.section_name ?? '');
  return {
    id: `zara:${raw.id}`,
    brand: 'Zara',
    name: raw.name ?? `Ürün ${raw.display_reference ?? raw.id}`,
    category: categoryTR(fam),
    gender: /KID|BOY|GIRL|BABY|CHILD|NI[ÑN]/i.test(sec) ? 'Çocuk' : /^MAN|^MEN|HOMBRE/i.test(sec) ? 'Erkek' : 'Kadın',
    color: raw.colors?.[0]?.name || '-',
    composition: '-',
    origin: '-',
    price,
    originalPrice: typeof raw.old_price === 'number' ? raw.old_price : null,
    currency: raw.currency ?? 'EUR',
    launched: null,
    rank: null,
    comingSoon: /coming/i.test(String(raw.availability)),
    isLook: String(raw.name).toUpperCase() === 'LOOK',
    sizes: [{ size: 'ALL', state }],
    image: img ? String(img).replace('{width}', '300') : '',
  };
}

export function mapItem(raw) {
  if (raw?.product_id == null && raw?.productId !== undefined && Array.isArray(raw?.sizes)) return mapZaraScraper(raw);
  if (raw?.product_id == null && raw?.id != null && raw?.availability !== undefined && raw?.reference) return mapZaraApi(raw);
  if (raw?.product_id == null) return null;
  const comingSoon = raw.visibility === 'COMING_SOON';
  const isLook = raw.product_type === 'Bundle'; // Zara "LOOK": kombin, tek ürün değil
  let sizes;
  if (Array.isArray(raw.variants) && raw.variants.length) {
    sizes = raw.variants.map(v => ({ size: String(v.size), state: v.is_buyable === false || v.back_soon === true ? 'out' : 'in' }));
  } else {
    // Zara overview: beden yok, yalnızca ürün düzeyi durum
    sizes = [{ size: 'ALL', state: stockState(raw.availability ?? raw.colors?.[0]?.availability) }];
  }
  const sec = String(raw.section_name_en ?? raw.section_name ?? '');
  const price = typeof raw.price === 'number' ? raw.price : null;
  return {
    id: `${raw.brand}:${raw.product_id}`,
    brand: BRAND[raw.brand] ?? String(raw.brand),
    name: raw.name_en ?? raw.name ?? raw.description?.slice(0, 40) ?? `Ürün ${raw.display_reference ?? raw.product_id}`,
    category: categoryTR(raw.family_name_en ?? raw.family_name ?? raw.subfamily_name_en ?? raw.subfamily_name),
    gender: /KID|BOY|GIRL|BABY|CHILD|KINDER|JUNIOR|\bNI[ÑN]|TEEN|MINI/i.test(sec) ? 'Çocuk' : /^MAN|^MEN|HERREN|HOMBRE/i.test(sec) ? 'Erkek' : 'Kadın',
    color: raw.color_name ?? '-',
    composition: compositionText(raw.composition),
    origin: originTR(mostCommon((raw.variants ?? []).map(v => v.origin))),
    price,
    originalPrice: typeof raw.old_price === 'number' ? raw.old_price : null,
    currency: raw.currency ?? 'EUR',
    launched: String(raw.first_visible_date ?? raw.availability_date ?? '').slice(0, 10) || null,
    rank: raw.grid_position ?? null,        // Zara "THE NEW" sıralaması
    comingSoon,
    isLook,
    sizes,
    image: raw.main_image ?? '',
  };
}
