// Küçük sunucu: Apify'dan ürün çeker, anlık görüntüleri saklar, uygulamaya sunar.
// Token YALNIZCA ortam değişkeninden okunur: APIFY_TOKEN. Asla istemciye gönderilmez.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { mapItem } from './map.js';
import { load, save, record, derive } from './store.js';

const PORT = +(process.env.PORT || 8787);
const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = process.env.APIFY_ACTOR || 'sian.agency~inditex-product-scraper';
const BASE = process.env.APIFY_BASE || 'https://api.apify.com';
const APP_KEY = process.env.APP_KEY || '';              // isteğe bağlı: uygulama↔sunucu parolası
const MAX_USD = process.env.APIFY_MAX_USD || '2';       // tek çalıştırma maliyet tavanı
const INPUT_FILE = process.env.APIFY_INPUT_FILE || path.join(import.meta.dirname, 'input.json');
const DIST = path.join(import.meta.dirname, '..', 'dist');

let lastRaw = null;
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'x-app-key,content-type' }); res.end(JSON.stringify(body)); };

export async function sync() {
  if (!TOKEN) throw Object.assign(new Error('APIFY_TOKEN tanımlı değil'), { code: 503 });
  let input = {};
  try { input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8')); } catch { throw Object.assign(new Error(`${INPUT_FILE} bulunamadı veya geçersiz. Apify konsolundaki JSON girdisini buraya kaydedin.`), { code: 400 }); }
  const url = `${BASE}/v2/acts/${ACTOR}/run-sync-get-dataset-items?maxTotalChargeUsd=${MAX_USD}&timeout=280`;
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(input) });
  if (!r.ok) throw Object.assign(new Error(`Apify ${r.status}: ${(await r.text()).slice(0, 200)}`), { code: 502 });
  const raw = await r.json();
  lastRaw = raw[0] ?? null;
  const mapped = raw.map(mapItem).filter(Boolean);
  const db = load(); record(db, mapped); save(db);
  return { fetched: raw.length, mapped: mapped.length, skipped: raw.length - mapped.length };
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

export const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (u.pathname.startsWith('/api/')) {
    if (APP_KEY && req.headers['x-app-key'] !== APP_KEY) return json(res, 401, { error: 'yetkisiz' });
    try {
      if (u.pathname === '/api/health') return json(res, 200, { ok: true, tokenSet: !!TOKEN, actor: ACTOR });
      if (u.pathname === '/api/products') { const db = load(); return json(res, 200, { syncs: db.syncs.slice(-5), products: derive(db) }); }
      if (u.pathname === '/api/sync' && req.method === 'POST') return json(res, 200, await sync());
      if (u.pathname === '/api/debug/sample') return json(res, 200, { keys: lastRaw ? Object.keys(lastRaw) : [], sample: lastRaw });
      return json(res, 404, { error: 'yok' });
    } catch (e) { return json(res, e.code || 500, { error: e.message }); }
  }
  // Derlenmiş uygulamayı sun (tek sunucu)
  let f = path.join(DIST, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) f = path.join(DIST, 'index.html');
  try { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }
  catch { res.writeHead(404); res.end(); }
});

if (import.meta.url === `file://${process.argv[1]}`) server.listen(PORT, () => console.log(`Sunucu :${PORT} · token ${TOKEN ? 'var' : 'YOK'}`));
