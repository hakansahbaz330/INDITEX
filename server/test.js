// Token gerektirmeyen test. Sahte Apify sunucusu, gerçek aktör çıktısından alınmış 8 satırlık örneği (fixtures/sample.json) döndürür.
import http from 'node:http';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const fixture = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'sample.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir-'));
const mock = http.createServer((req, res) => {
  assert.match(req.url, /run-sync-get-dataset-items\?maxTotalChargeUsd=/);
  assert.equal(req.headers.authorization, 'Bearer TESTTOKEN');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify([...fixture, { noid: true }]));
});
await new Promise(r => mock.listen(0, r));
process.env.APIFY_TOKEN = 'TESTTOKEN';
process.env.APIFY_BASE = `http://localhost:${mock.address().port}`;
process.env.DATA_FILE = path.join(tmp, 's.json');
process.env.APIFY_INPUT_FILE = path.join(tmp, 'in.json');
fs.writeFileSync(process.env.APIFY_INPUT_FILE, '{}');

const { sync } = await import('./index.js');
const { load, record, derive } = await import('./store.js');
const { mapItem, originTR, categoryTR } = await import('./map.js');

// 1) Uçtan uca: COMING_SOON ve Zara Home kaydedilmez, geçersiz satır atlanır
const r = await sync();
assert.equal(r.fetched, fixture.length + 1);
assert.equal(r.skipped, 1);
assert.equal(r.comingSoon, fixture.filter(p => p.visibility === 'COMING_SOON').length);
assert.ok(r.mapped >= 4, 'ürünler kaydedilmeli');
const db = load();
assert.ok(!Object.keys(db.items).some(k => k.startsWith('zarahome:')));

// 2) Eşleştirme gerçek şemaya göre
const bs = fixture.find(p => p.brand === 'bershka' && p.visibility === 'SHOW' && p.variants.some(v => v.back_soon));
const m = mapItem(bs);
assert.equal(m.brand, 'Bershka');
assert.ok(m.sizes.some(s => s.state === 'out') && m.sizes.some(s => s.state === 'in'));
assert.equal(m.launched, '2026-10-26');
const z = mapItem(fixture.find(p => p.brand === 'zara'));
assert.equal(mapItem(fixture.find(p => p.product_type === 'Bundle')).isLook, true);
assert.equal(z.sizes.length, 1);          // overview: yalnızca ürün düzeyi durum
assert.equal(originTR('KAMBODSCHA (EHEM. KAMPUTSCHEA)'), 'Kamboçya');
assert.equal(originTR('CHINA KONTINENTAL'), 'Çin');
assert.equal(originTR('MAROKKO'), 'Fas');
assert.equal(categoryTR('Knitwear'), 'Triko');
assert.equal(categoryTR('T SHIRT'), 'Tişört');
assert.equal(categoryTR('Knit cardigan'), 'Hırka');
assert.equal(categoryTR('Padded vest'), 'Yelek');
assert.equal(mapItem({ ...fixture[1], section_name_en: 'KID GIRL' }).gender, 'Çocuk');
assert.equal(mapItem({ ...fixture[1], section_name_en: 'MAN' }).gender, 'Erkek');
assert.equal(categoryTR('SHIRT'), 'Gömlek');
assert.equal(categoryTR('Sneakers'), 'Ayakkabı & Aksesuar');
assert.equal(categoryTR('COATS'), 'Ceket & Mont');
assert.equal(categoryTR('TROUSERS'), 'Pantolon');

// 2b) rl1987/zara-api-scraper biçimi
const zfix = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'zara-api.json'), 'utf8'));
const zm = zfix.map(mapItem);
assert.ok(zm.every(Boolean));
assert.equal(zm[0].brand, 'Zara');
assert.equal(zm[0].currency, 'USD');
assert.equal(zm[0].category, 'Ayakkabı & Aksesuar');
assert.equal(zm[1].originalPrice, 79.9);
assert.equal(zm[2].isLook, true);
assert.equal(zm[3].comingSoon, true);

// 2c) zara-scraper biçimi (beden bazlı talep işareti, çıkış tarihi, kumaş metni)
const zs = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'zara-scraper.json'), 'utf8')).map(mapItem);
assert.ok(zs.every(Boolean));
assert.equal(zs[0].id, 'zara:589443573');
assert.equal(zs[0].sizes.length, 3);
assert.equal(zs[0].launched, '2026-10-28');
assert.equal(zs[0].composition, '%63 viscose, %37 polyester');
assert.equal(zs[0].category, 'Elbise');
assert.equal(zs[1].composition, '-');            // yalnızca astar bilgisi varsa dış kumaş bilinmiyor
assert.equal(zs[2].category, 'Elbise');          // "blazer dress": kategori yolu elbise diyor
assert.equal(zs[3].composition, '%100 acetate');
assert.equal(mapItem({ ...JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'zara-scraper.json'), 'utf8'))[0], composition: 'Not Disclosed' }).composition, '-');
assert.equal(zs[0].demand, 'DEMAND_REGULAR');
assert.equal(zs[0].originalPrice, null);         // "N/A"

// 2d) DEMAND_RUNNING_OUT → beden "az kaldı" olur, ürün talep işareti en yüksek öncelikle gelir
const ro = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'zara-scraper.json'), 'utf8'))[0];
ro.sizes[1].demand = 'DEMAND_RUNNING_OUT'; ro.sizes[2].demand = 'DEMAND_HIGH';
const rm = mapItem(ro);
assert.equal(rm.sizes[1].state, 'low');
assert.equal(rm.sizes[2].state, 'in');
assert.equal(rm.demand, 'DEMAND_RUNNING_OUT');

// 3) Çok günlü türetme
const mk = (states, price) => ({ ...mapItem({ ...bs, product_id: 1, price, variants: states.map((s, i) => ({ size: String(i), is_buyable: true, back_soon: s === 'out', origin: 'MAROKKO' })) }), launched: '2026-01-01' });
const d = { items: {}, syncs: [] };
record(d, [mk(['in', 'in', 'in', 'in'], 30)], '2026-01-01');
record(d, [mk(['in', 'in', 'in', 'in'], 30)], '2026-01-03');
record(d, [mk(['out', 'out', 'in', 'in'], 30)], '2026-01-04');
record(d, [mk(['in', 'out', 'in', 'in'], 24)], '2026-01-09');
const p = derive(d, '2026-01-10')[0];
assert.equal(p.soldOutDays, 3);
assert.equal(p.restocks, 1);
assert.equal(p.markdown, 0.2);
assert.equal(p.daysOnline, 9);
assert.equal(p.sizesOut, 1);
assert.equal(p.origin, 'Fas');
console.log('Tüm testler geçti', r);
mock.close(); process.exit(0);
