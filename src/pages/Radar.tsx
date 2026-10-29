import { useMemo, useState } from 'react';
import type { Store } from '../store';
import type { Brand, Product, Sample } from '../types';
import { WEIGHT_LABELS, groupAvg, score, signals, stockoutEta, verdict } from '../scoring';
import { Badge, Bar, ScoreRing, Spark, originFlag, proximity } from '../ui';

const BRANDS: ('Hepsi' | Brand)[] = ['Hepsi', 'Zara', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Massimo Dutti', 'Oysho'];

export default function Radar({ s }: { s: Store }) {
  const [brand, setBrand] = useState<'Hepsi' | Brand>('Hepsi');
  const [cat, setCat] = useState('Hepsi');
  const [q, setQ] = useState('');
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [sel, setSel] = useState<Product | null>(null);

  const cats = useMemo(() => ['Hepsi', ...new Set(s.products.map(p => p.category))], [s.products]);
  const rows = useMemo(() =>
    s.products
      .filter(p => (brand === 'Hepsi' || p.brand === brand) && (cat === 'Hepsi' || p.category === cat)
        && (!onlyWatch || s.watch.includes(p.id)) && (p.name + p.color + p.category).toLowerCase().includes(q.toLowerCase()))
      .map(p => ({ p, sc: score(p, s.weights) }))
      .sort((a, b) => b.sc - a.sc),
    [s.products, s.weights, s.watch, brand, cat, q, onlyWatch]);

  const hot = rows.filter(r => r.sc >= 70).length;
  const soon = rows.filter(r => r.p.sizesOut > 0 && r.p.sizesOut < r.p.sizesTotal && r.sc >= 55).length;

  return (
    <>
      <section className="tiles">
        <div><b>{rows.length}</b><span>Takipte ürün</span></div>
        <div><b className="t-hot">{hot}</b><span>Acil fırsat</span></div>
        <div><b className="t-warm">{soon}</b><span>Tükenmek üzere</span></div>
      </section>
      <input className="search" placeholder="Ürün, renk, kategori ara…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="chips">{BRANDS.map(b => <button key={b} className={brand === b ? 'on' : ''} onClick={() => setBrand(b)}>{b}</button>)}</div>
      <div className="row">
        <select value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <label className="chk"><input type="checkbox" checked={onlyWatch} onChange={e => setOnlyWatch(e.target.checked)} /> Sadece izlediklerim</label>
      </div>
      <ul className="list">
        {rows.map(({ p, sc }) => (
          <li key={p.id} onClick={() => setSel(p)}>
            <div className="thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : p.image}</div>
            <div className="meta">
              <b>{p.name}</b>
              <small>{p.brand} · {p.category} · {p.color}</small>
              <small>{originFlag(p.origin)} {p.origin} · {p.sizesOut}/{p.sizesTotal} beden tükendi · {stockoutEta(p)}</small>
              <Badge v={verdict(sc, p)} />
            </div>
            <ScoreRing value={sc} />
          </li>
        ))}
        {!rows.length && <p className="empty">Filtreye uyan ürün yok.</p>}
      </ul>
      {sel && <Detail p={sel} s={s} onClose={() => setSel(null)} />}
    </>
  );
}

function Detail({ p, s, onClose }: { p: Product; s: Store; onClose: () => void }) {
  const sc = score(p, s.weights);
  const sig = signals(p);
  const watching = s.watch.includes(p.id);
  const peers = s.products.filter(x => x.category === p.category && x.id !== p.id);
  const bestColor = groupAvg(peers, s.weights, x => x.color)[0];
  const bestFabric = groupAvg(peers, s.weights, x => x.fabric)[0];
  const bestFit = groupAvg(peers, s.weights, x => x.fit)[0];
  const planned = s.samples.some(x => x.refId === p.id);

  const addSample = () => {
    const smp: Sample = {
      id: `S${Date.now()}`, refId: p.id, brand: p.brand, title: `${p.name} – ${bestColor?.key ?? p.color} varyasyonu`,
      category: p.category, score: sc, status: 'Hazırlanıyor', createdAt: new Date().toISOString(),
      note: `Referans: ${p.brand} ${p.name}`, attrs: { color: bestColor?.key ?? p.color, fabric: bestFabric?.key ?? p.fabric, fit: bestFit?.key ?? p.fit },
    };
    s.setSamples([smp, ...s.samples]);
  };

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Kapat">✕</button>
        <div className="sheet-head">
          <div className="thumb big">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : p.image}</div>
          <div><h2>{p.name}</h2><small>{p.brand} · {p.category} · {p.gender}</small><br /><Badge v={verdict(sc, p)} /></div>
          <ScoreRing value={sc} />
        </div>
        <div className="kv">
          <div><span>Fiyat</span><b>€{p.price.toFixed(2)}</b></div>
          <div><span>Renk</span><b>{p.color}</b></div>
          <div><span>Kumaş</span><b>{p.fabric}</b></div>
          <div><span>Kalıp</span><b>{p.fit}</b></div>
          <div><span>Üretim yeri</span><b>{originFlag(p.origin)} {p.origin}{proximity(p) ? ' · yakın tedarik' : ''}</b></div>
          <div><span>Koleksiyonda</span><b>{p.daysOnline} gün</b></div>
          <div><span>Tahmini tükenme</span><b>{stockoutEta(p)}</b></div>
          <div><span>Yeniden stok</span><b>{p.restocks}×</b></div>
        </div>
        <h3>Sinyal dökümü</h3>
        {(Object.keys(sig) as (keyof typeof sig)[]).map(k => <Bar key={k} label={WEIGHT_LABELS[k]} value={sig[k]} />)}
        <h3>Son 12 hafta tükenme eğilimi</h3>
        <Spark data={p.history} />
        <h3>Bu ürüne benzer ne üretmeli?</h3>
        <p className="hint">Aynı kategorideki ürünlerin ortalama skoruna göre en yüksek performanslı özellikler:</p>
        <ul className="plain">
          {bestColor && <li>🎨 Renk: <b>{bestColor.key}</b> (ort. skor {bestColor.avg}, {bestColor.n} ürün)</li>}
          {bestFabric && <li>🧵 Kumaş: <b>{bestFabric.key}</b> (ort. skor {bestFabric.avg})</li>}
          {bestFit && <li>📐 Kalıp: <b>{bestFit.key}</b> (ort. skor {bestFit.avg})</li>}
        </ul>
        <div className="row">
          <button className="btn" disabled={planned} onClick={addSample}>{planned ? 'Numune planında ✓' : '+ Numune planına ekle'}</button>
          <button className="btn ghost" onClick={() => s.setWatch(watching ? s.watch.filter(i => i !== p.id) : [...s.watch, p.id])}>
            {watching ? '★ İzleniyor' : '☆ İzle'}
          </button>
        </div>
      </div>
    </div>
  );
}
