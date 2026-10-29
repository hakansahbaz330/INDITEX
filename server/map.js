// Apify aktör çıktısını (satır başına bir ürün) ortak biçime çevirir.
// UYARI: sian.agency aktörünün 58 sütununun gerçek adlarını doğrulayamadık.
// Bu yüzden her alan için birden fazla aday anahtar denenir. Gerçek çıktıyı görünce
// aşağıdaki FIELDS listelerini daraltın (bkz. GET /api/debug/sample).

export const FIELDS = {
  id: ['id', 'productId', 'product_id', 'sku', 'url'],
  brand: ['brand', 'brandName', 'brand_name'],
  name: ['name', 'title', 'productName'],
  category: ['category', 'categoryName', 'section', 'family', 'subfamily'],
  color: ['color', 'colour', 'colorName'],
  price: ['price', 'currentPrice', 'salePrice', 'priceValue'],
  originalPrice: ['originalPrice', 'oldPrice', 'priceOriginal', 'regularPrice', 'fullPrice'],
  composition: ['composition', 'materials', 'material', 'fabric'],
  origin: ['madeIn', 'origin', 'countryOfOrigin', 'manufacturedIn'],
  launched: ['releaseDate', 'launchDate', 'createdAt', 'dateAdded', 'firstSeen'],
  sizes: ['sizes', 'skus', 'variants', 'sizeStock'],
  image: ['image', 'imageUrl', 'mainImage', 'images'],
};
const SIZE_NAME = ['size', 'name', 'sizeName', 'label'];
const SIZE_STOCK = ['availability', 'stock', 'status', 'inStock', 'available', 'quantity', 'stockStatus'];

const pick = (o, keys) => { for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };

/** 'in' | 'low' | 'out' */
export function stockState(v, lowAt = 3) {
  if (typeof v === 'boolean') return v ? 'in' : 'out';
  if (typeof v === 'number') return v <= 0 ? 'out' : v <= lowAt ? 'low' : 'in';
  const s = String(v ?? '').toLowerCase();
  if (/(out|sold|unavail|agotad|no[_ -]?stock|false)/.test(s)) return 'out';
  if (/(low|last|few|poco|limited)/.test(s)) return 'low';
  return 'in';
}

const num = v => { const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : null; };

export function mapItem(raw) {
  const sizesRaw = pick(raw, FIELDS.sizes);
  const sizes = Array.isArray(sizesRaw)
    ? sizesRaw.map(s => ({ size: String(pick(s, SIZE_NAME) ?? '?'), state: stockState(pick(s, SIZE_STOCK)) }))
    : [];
  const img = pick(raw, FIELDS.image);
  const id = pick(raw, FIELDS.id);
  if (id === undefined) return null;
  return {
    id: String(id),
    brand: String(pick(raw, FIELDS.brand) ?? 'Zara'),
    name: String(pick(raw, FIELDS.name) ?? 'Adsız ürün'),
    category: String(pick(raw, FIELDS.category) ?? 'Diğer'),
    color: String(pick(raw, FIELDS.color) ?? '-'),
    composition: String(pick(raw, FIELDS.composition) ?? '-'),
    origin: String(pick(raw, FIELDS.origin) ?? '-'),
    price: num(pick(raw, FIELDS.price)),
    originalPrice: num(pick(raw, FIELDS.originalPrice)),
    launched: pick(raw, FIELDS.launched) ? String(pick(raw, FIELDS.launched)).slice(0, 10) : null,
    sizes,
    image: Array.isArray(img) ? String(img[0] ?? '') : String(img ?? ''),
  };
}
