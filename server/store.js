// Günlük anlık görüntüleri JSON dosyasında tutar ve uygulamanın Product şemasına türetir.
import fs from 'node:fs';
import path from 'node:path';
export { record, derive } from './snap.js';

const FILE = process.env.DATA_FILE || path.join(import.meta.dirname, 'data', 'snapshots.json');

export function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { items: {}, syncs: [] }; }
}
export function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db));
}

