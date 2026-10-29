// Elde edilmiş Apify çıktı dosyalarını (JSON) public/data/snapshots.json içine ekler.
// Kullanım: node scripts/import-files.mjs dosya1.json dosya2.json ...
import fs from 'node:fs';
import path from 'node:path';
import { prepare } from '../server/pipeline.js';
import { record, prune } from '../server/snap.js';

const FILE = process.env.DATA_FILE || path.join(import.meta.dirname, '..', 'public', 'data', 'snapshots.json');
let db = { items: {}, syncs: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* yeni dosya */ }
for (const f of process.argv.slice(2)) {
  const { keep, date, stats } = prepare(JSON.parse(fs.readFileSync(f, 'utf8')));
  if (keep.length) record(db, keep, date);
  console.log(path.basename(f).slice(0, 48), date, stats);
}
prune(db);
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db));
console.log('Toplam ürün:', Object.keys(db.items).length, '· dosya', (fs.statSync(FILE).size / 1024).toFixed(0), 'KB');
