// Günlük çekim: Apify → anlık görüntü dosyası (data/snapshots.json). GitHub Actions bunu her gün çalıştırır.
import fs from 'node:fs';
import path from 'node:path';
import { runAndFetch } from '../server/apify.js';
import { prepare } from '../server/pipeline.js';
import { record, prune } from '../server/snap.js';

const FILE = process.env.DATA_FILE || path.join(import.meta.dirname, '..', 'public', 'data', 'snapshots.json');
const raw = await runAndFetch({
  base: process.env.APIFY_BASE, token: process.env.APIFY_TOKEN, taskId: process.env.APIFY_TASK_ID,
  actor: process.env.APIFY_ACTOR, input: process.env.APIFY_INPUT ? JSON.parse(process.env.APIFY_INPUT) : undefined,
  maxUsd: process.env.APIFY_MAX_USD || '2', pollMs: +(process.env.POLL_MS || 5000), log: console.log,
});
const { keep, date, stats } = prepare(raw);
if (!keep.length) {
  const keys = Object.keys(raw.find(r => r && typeof r === 'object') ?? {}).slice(0, 40).join(', ');
  throw new Error(`Kullanılabilir ürün yok (${raw.length} satır). Aktör çıktısı tanınmıyor olabilir. İlk satırdaki alanlar: ${keys}`);
}
let db = { items: {}, syncs: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* ilk çalıştırma */ }
record(db, keep, date);
prune(db);
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db));
console.log(`Tamam: ${date}`, stats, `· toplam ürün: ${Object.keys(db.items).length}`);
