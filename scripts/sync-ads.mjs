// Meta Reklam Kitaplığı'ndan seçili markaların aktif reklamlarını çeker → public/data/ads.json
import fs from 'node:fs';
import path from 'node:path';
import { fetchBrandAds } from '../server/meta.js';
import { mapAd, mergeAds, emptyAds } from '../server/ads.js';

const root = path.join(import.meta.dirname, '..');
const FILE = process.env.ADS_FILE || path.join(root, 'public', 'data', 'ads.json');
const CONFIG = process.env.ADS_CONFIG || path.join(root, 'config', 'ad-brands.json');
const token = process.env.META_ACCESS_TOKEN;
if (!token) { console.log('META_ACCESS_TOKEN tanımlı değil; reklam çekimi atlandı.'); process.exit(0); }

const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
let db = emptyAds();
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* ilk çalıştırma */ }
const today = new Date().toISOString().slice(0, 10);
const mapped = [], names = [], failures = [];
for (const brand of cfg.brands) {
  try {
    const raw = await fetchBrandAds({ base: process.env.META_BASE, version: process.env.META_VERSION, token, brand, countries: cfg.countries, log: console.log });
    // Anahtar kelime aramasında başka sayfaların reklamları da gelebilir: sayfa adı markayı içermeli
    const own = brand.pageId ? raw : raw.filter(r => String(r.page_name ?? '').toLowerCase().includes(brand.name.toLowerCase()));
    mapped.push(...own.map(r => mapAd(r, brand.name)).filter(Boolean));
    names.push(brand.name);
  } catch (e) { failures.push(`${brand.name}: ${e.message}`); console.error(`HATA ${brand.name}: ${e.message}`); }
}
if (!names.length) { console.error('Hiçbir marka çekilemedi; dosya değiştirilmedi.'); process.exit(1); }
mergeAds(db, mapped, names, today);
db.failures = failures;
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db));
console.log(`Tamam: ${mapped.length} aktif reklam, ${names.length}/${cfg.brands.length} marka`, failures.length ? `· hata: ${failures.length}` : '');
if (failures.length) process.exitCode = 0;
