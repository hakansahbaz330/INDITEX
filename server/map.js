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
  [/shoe|boot|sneaker|sandal|jewel|\bcap\b|sock|\bbag|belt|scarf|hat\b|glove/i, 'Ayakkabı & Aksesuar'],
  [/\bbra\b|underwear|lingerie|brief|pyjama|pajama/i, 'İç Giyim'],
  [/knit|sweater|jersey|cardigan|pullover|strick|triko/i, 'Triko'], [/sweat|hoodie/i, 'Sweatshirt'],
  [/denim|jean/i, 'Denim'], [/coat|jacket|bomber|blazer|outwear|parka|anorak|mantel|jacke|puffer|trench|vest/i, 'Ceket & Mont'],
  [/trouser|pant|legging|jogger|cargo/i, 'Pantolon'], [/t[\s-]?shirt|\btee\b|\btops?\b|tank|bodysuit|polo/i, 'Tişört'],
  [/shirt|blouse|bluse|hemd/i, 'Gömlek'], [/dress|kleid|jumpsuit/i, 'Elbise'], [/skirt|rock/i, 'Etek'],
  [/suit|set|co-?ord|tracksuit/i, 'Takım & Set'],
];
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

export function mapItem(raw) {
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
    gender: /^MAN|^MEN|HERREN|HOMBRE/i.test(sec) ? 'Erkek' : 'Kadın',
    color: raw.color_name ?? '-',
    composition: compositionText(raw.composition),
    origin: originTR(mostCommon((raw.variants ?? []).map(v => v.origin))),
    price,
    originalPrice: typeof raw.old_price === 'number' ? raw.old_price : null,
    launched: String(raw.first_visible_date ?? raw.availability_date ?? '').slice(0, 10) || null,
    rank: raw.grid_position ?? null,        // Zara "THE NEW" sıralaması
    comingSoon,
    isLook,
    sizes,
    image: raw.main_image ?? '',
  };
}
