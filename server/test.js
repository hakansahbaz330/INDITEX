// Token gerektirmeyen test. SENTETİK veri kullanır; gerçek aktör çıktısı değildir.
import http from 'node:http';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir-'));
const mock = http.createServer((req, res) => {
  assert.match(req.url, /run-sync-get-dataset-items\?maxTotalChargeUsd=/);
  assert.equal(req.headers.authorization, 'Bearer TESTTOKEN');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify([
    { id: 'A1', brand: 'Zara', name: 'Test Kazak', category: 'Triko', color: 'Ekru', price: '39,95 EUR', sizes: [{ size: 'S', availability: 'in_stock' }, { size: 'M', availability: 'low_on_stock' }, { size: 'L', availability: 'out_of_stock' }] },
    { noid: true },
  ]));
});
await new Promise(r => mock.listen(0, r));
process.env.APIFY_TOKEN = 'TESTTOKEN';
process.env.APIFY_BASE = `http://localhost:${mock.address().port}`;
process.env.DATA_FILE = path.join(tmp, 's.json');
process.env.APIFY_INPUT_FILE = path.join(tmp, 'in.json');
fs.writeFileSync(process.env.APIFY_INPUT_FILE, '{"brands":["Zara"]}');

const { sync } = await import('./index.js');
const { load, record, derive } = await import('./store.js');
const { mapItem } = await import('./map.js');

const r = await sync();
assert.deepEqual(r, { fetched: 2, mapped: 1, skipped: 1 });
const db = load();
assert.equal(db.items.A1.snaps[0].out, 1);
assert.equal(db.items.A1.snaps[0].price, 39.95);

// Çok günlü senaryo: 10 gün önce hiç tükenme yok → 3 gün sonra 2 beden tükenir → 5 gün sonra yeniden stok
const mk = (st, price) => mapItem({ id: 'B2', name: 'X', sizes: st.map((s, i) => ({ size: i, availability: s })), price });
const d = { items: {}, syncs: [] };
record(d, [mk(['in', 'in', 'in', 'in'], 30)], '2025-01-01');
record(d, [mk(['in', 'in', 'in', 'in'], 30)], '2025-01-03');
record(d, [mk(['out', 'out', 'in', 'in'], 30)], '2025-01-04');
record(d, [mk(['in', 'out', 'in', 'in'], 24)], '2025-01-09');
const p = derive(d, '2025-01-10').find(x => x.id === 'B2');
assert.equal(p.soldOutDays, 3);
assert.equal(p.restocks, 1);
assert.equal(p.markdown, 0.2);
assert.equal(p.daysOnline, 9);
assert.equal(p.sizesOut, 1);
console.log('Tüm testler geçti', { soldOutDays: p.soldOutDays, restocks: p.restocks, markdown: p.markdown });
mock.close(); process.exit(0);
