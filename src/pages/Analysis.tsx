import type { Store } from '../store';
import { groupAvg, score } from '../scoring';
import { originFlag } from '../ui';
import type { Product } from '../types';
import FilterBar from '../FilterBar';
import { groupOf, knitOf, passes } from '../classify';

function Rank({ title, data }: { title: string; data: { key: string; n: number; avg: number }[] }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {data.slice(0, 6).map(d => (
        <div className="bar-row" key={d.key}>
          <span className="bar-label">{d.key} <small>({d.n})</small></span>
          <div className="bar"><i style={{ width: `${d.avg}%` }} /></div>
          <span className="bar-val">{d.avg}</span>
        </div>
      ))}
    </section>
  );
}

export default function Analysis({ s }: { s: Store }) {
  const P = s.products.filter(p => passes(p, s.filters));
  const by = (f: (p: Product) => string) => groupAvg(P, s.weights, f);
  const origins = new Map<string, number>();
  P.filter(p => score(p, s.weights) >= 55).forEach(p => origins.set(p.origin, (origins.get(p.origin) ?? 0) + 1));
  const oTotal = [...origins.values()].reduce((a, b) => a + b, 0) || 1;
  const oRows = [...origins].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <FilterBar s={s} />
      <p className="hint">{P.length} ürün üzerinden. Ortalama fırsat skoru (0–100). Parantez içi: örnek sayısı.</p>
      <Rank title="Ürün grubu" data={by(p => groupOf(p))} />
      <Rank title="Cinsiyet" data={by(p => p.gender)} />
      <Rank title="Örme / penye mi?" data={by(p => ({ kesin: 'Örme/penye (kesin)', olası: 'Örme/penye (olası)', dokuma: 'Dokuma' })[knitOf(p)])} />
      <Rank title="Ürün türü ısı haritası" data={by(p => p.category)} />
      <Rank title="Marka" data={by(p => p.brand)} />
      <Rank title="Renk" data={by(p => p.color)} />
      <Rank title="Kumaş" data={by(p => p.fabric)} />
      <Rank title="Kalıp" data={by(p => p.fit)} />
      <section className="card">
        <h3>Çok satan ürünler nerede üretiliyor?</h3>
        <p className="hint">Skoru ≥55 olan ürünlerin üretim ülkesi dağılımı — rakip kapasitesini ve fiyat rekabetini gösterir.</p>
        {oRows.map(([o, n]) => (
          <div className="bar-row" key={o}>
            <span className="bar-label">{originFlag(o)} {o}</span>
            <div className="bar"><i style={{ width: `${(n / oTotal) * 100}%` }} /></div>
            <span className="bar-val">{Math.round((n / oTotal) * 100)}%</span>
          </div>
        ))}
      </section>
    </>
  );
}
