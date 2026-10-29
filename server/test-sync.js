// Token gerektirmeyen test: sahte Apify (görev başlat → durum → sonuç) ile scripts/sync.mjs'i çalıştırır.
import http from 'node:http';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const fixture = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'sample.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir-'));
let polls = 0;
const mock = http.createServer((req, res) => {
  assert.equal(req.headers.authorization, 'Bearer TESTTOKEN');
  res.setHeader('content-type', 'application/json');
  if (req.method === 'POST' && req.url.startsWith('/v2/actor-tasks/TASK1/runs?maxTotalChargeUsd=')) return res.end(JSON.stringify({ data: { id: 'RUN1', status: 'RUNNING', defaultDatasetId: 'DS1' } }));
  if (req.url === '/v2/actor-runs/RUN1') return res.end(JSON.stringify({ data: { id: 'RUN1', status: ++polls < 2 ? 'RUNNING' : 'SUCCEEDED', defaultDatasetId: 'DS1' } }));
  if (req.url.startsWith('/v2/datasets/DS1/items')) return res.end(JSON.stringify(fixture));
  res.statusCode = 404; res.end('{}');
});
await new Promise(r => mock.listen(0, r));
const env = { ...process.env, APIFY_TOKEN: 'TESTTOKEN', APIFY_TASK_ID: 'TASK1', APIFY_BASE: `http://localhost:${mock.address().port}`, DATA_FILE: path.join(tmp, 'd.json'), POLL_MS: '20' };
const run = () => new Promise((ok, no) => import('node:child_process').then(({ execFile }) => execFile('node', ['scripts/sync.mjs'], { env }, (e, so, se) => (e ? no(new Error(se || e.message)) : ok(so)))));
const out = await run();
assert.match(out, /Tamam:/);
const db = JSON.parse(fs.readFileSync(env.DATA_FILE, 'utf8'));
assert.ok(Object.keys(db.items).length >= 4);
await run();                                  // aynı gün tekrar: yinelenen anlık görüntü oluşmaz
const db2 = JSON.parse(fs.readFileSync(env.DATA_FILE, 'utf8'));
assert.ok(Object.values(db2.items).every(e => e.snaps.length === 1));
console.log('Senkron testi geçti', Object.keys(db2.items).length, 'ürün');
mock.close(); process.exit(0);
