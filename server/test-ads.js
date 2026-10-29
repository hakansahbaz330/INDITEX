// Token gerektirmeyen test: sahte Graph API ile reklam çekimi, sayfalama, alan geri dönüşü, token sızıntısı kontrolü.
import http from 'node:http';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { categorize, mergeAds, summarize, intensityMap, emptyAds, mapAd } from './ads.js';

// 1) Saf fonksiyonlar
assert.deepEqual(categorize('Knit cardigan with buttons'), ['Hırka', 'Triko']);
assert.ok(categorize('Chaqueta acolchada y abrigo largo').includes('Ceket & Mont'));
assert.ok(categorize('Wollmantel und Strickpullover').includes('Triko'));
assert.deepEqual(categorize('New collection'), []);
const { genderHint, inFocus } = await import('./ads.js');
assert.equal(genderHint('Women knit coat'), 'Kadın');
assert.equal(genderHint('Men jacket'), 'Erkek');
assert.equal(genderHint('Kids puffer coat'), 'Çocuk');
assert.equal(genderHint('Coat for men and women'), null);
assert.ok(inFocus({ cats: ['Hırka'], gender: null }));
assert.ok(!inFocus({ cats: ['Hırka'], gender: 'Erkek' }));
assert.ok(!inFocus({ cats: ['Denim'], gender: 'Kadın' }));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir-'));
const calls = [];
const mk = (id, brandName, start, body) => ({ id, page_name: brandName, ad_delivery_start_time: start, ad_creative_bodies: [body], publisher_platforms: ['facebook', 'instagram'] });
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  calls.push(u);
  res.setHeader('content-type', 'application/json');
  assert.ok(u.pathname.endsWith('/ads_archive'));
  assert.equal(u.searchParams.get('access_token'), 'METATOKEN');
  // EU alanları ilk denemede reddedilsin (alan geri dönüşü testi)
  if (u.searchParams.get('fields').includes('eu_total_reach')) { res.statusCode = 400; return res.end(JSON.stringify({ error: { code: 100, message: 'Unknown field eu_total_reach' } })); }
  const term = u.searchParams.get('search_terms'), pid = u.searchParams.get('search_page_ids');
  if (pid) {
    if (!u.searchParams.get('after')) return res.end(JSON.stringify({ data: [mk('1', 'Zara', '2026-10-01', 'Long wool coat'), mk('2', 'Zara', '2026-10-27', 'Knit cardigan')], paging: { next: `http://localhost:${mock.address().port}${u.pathname}${u.search}&after=X` } }));
    return res.end(JSON.stringify({ data: [mk('3', 'Zara', '2026-10-28', 'New collection')] }));
  }
  if (term === 'Bershka') return res.end(JSON.stringify({ data: [mk('10', 'Bershka', '2026-10-20', 'Denim jeans'), mk('11', 'Bershka Outlet Shop', '2026-10-20', 'x'), mk('12', 'Başka Marka', '2026-10-20', 'y')] }));
  res.end(JSON.stringify({ data: [] }));
});
await new Promise(r => mock.listen(0, r));
const cfgFile = path.join(tmp, 'cfg.json');
fs.writeFileSync(cfgFile, JSON.stringify({ countries: ['DE'], brands: [{ name: 'Zara', pageId: '33331950906' }, { name: 'Bershka', search: 'Bershka' }] }));
const env = { ...process.env, META_ACCESS_TOKEN: 'METATOKEN', META_BASE: `http://localhost:${mock.address().port}`, ADS_FILE: path.join(tmp, 'ads.json'), ADS_CONFIG: cfgFile };
const run = e => new Promise((ok, no) => execFile('node', ['scripts/sync-ads.mjs'], { env: e }, (er, so, se) => (er ? no(new Error(se || er.message)) : ok(so))));

// token yoksa atlanır, hata vermez
assert.match(await run({ ...env, META_ACCESS_TOKEN: '' }), /atlandı/);

const out = await run(env);
assert.match(out, /Tamam: 5 aktif reklam/);       // Zara 3 + Bershka 2 (sayfa adı uymayan elenir)
const raw = fs.readFileSync(env.ADS_FILE, 'utf8');
assert.ok(!raw.includes('METATOKEN'), 'token dosyaya sızmamalı');
const db = JSON.parse(raw);
assert.equal(Object.keys(db.ads).length, 5);
assert.ok(db.ads['2'].cats.includes('Hırka'));

// 2) Özet ve ürün kategorisi yoğunluğu
const s = summarize(db, '2026-10-29');
assert.equal(s.Zara.active, 3);
assert.equal(s.Zara.new7, 2);
assert.equal(s.Zara.top[0].id, '1');              // en uzun süredir yayında
const f = summarize(db, '2026-10-29', { focus: true });
assert.equal(f.Zara.active, 2);                    // wool coat + knit cardigan; "New collection" odak dışı
assert.equal(f.Zara.all, 3);
assert.equal(f.Bershka.active, 0);                 // sadece denim
assert.equal(f.Zara.knit, 1);
const im = intensityMap(db, '2026-10-29');
assert.ok(im.Zara['Ceket & Mont'] > 0 && im.Zara['Ceket & Mont'] <= 100);

// 3) Görünmeyen reklam pasif olur
const d2 = emptyAds();
mergeAds(d2, [mapAd(mk('1', 'Zara', '2026-10-01', 'coat'), 'Zara')], ['Zara'], '2026-10-01');
mergeAds(d2, [], ['Zara'], '2026-10-02');
assert.equal(d2.ads['1'].active, false);
console.log('Reklam testi geçti');
mock.close(); process.exit(0);
