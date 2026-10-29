import type { Store } from '../store';
import type { Sample, SampleStatus } from '../types';

const STATUSES: SampleStatus[] = ['Hazırlanıyor', 'Gönderildi', 'Onaylandı', 'Reddedildi'];

export default function Samples({ s }: { s: Store }) {
  const sent = s.samples.filter(x => x.status === 'Onaylandı' || x.status === 'Reddedildi');
  const ok = sent.filter(x => x.status === 'Onaylandı');
  const rate = sent.length ? Math.round((ok.length / sent.length) * 100) : null;
  const upd = (id: string, status: SampleStatus) => s.setSamples(s.samples.map(x => (x.id === id ? { ...x, status } : x)));

  const winBy = (pick: (x: Sample) => string) => {
    const m = new Map<string, [number, number]>();
    sent.forEach(x => { const k = pick(x); const [a, b] = m.get(k) ?? [0, 0]; m.set(k, [a + (x.status === 'Onaylandı' ? 1 : 0), b + 1]); });
    return [...m].map(([k, [a, b]]) => ({ k, a, b })).sort((x, y) => y.a / y.b - x.a / x.b).slice(0, 3);
  };

  return (
    <>
      <section className="tiles">
        <div><b>{s.samples.length}</b><span>Toplam numune</span></div>
        <div><b className="t-hot">{rate === null ? '—' : `%${rate}`}</b><span>Onay oranı</span></div>
        <div><b>{ok.length}</b><span>Onaylanan</span></div>
      </section>
      {sent.length >= 3 && (
        <section className="card">
          <h3>Öğrenilen kazanan özellikler</h3>
          {[['Kategori', winBy(x => x.category)], ['Renk', winBy(x => x.attrs.color)], ['Kumaş', winBy(x => x.attrs.fabric)]].map(([t, d]) => (
            <p key={t as string} className="hint"><b>{t as string}:</b> {(d as { k: string; a: number; b: number }[]).map(x => `${x.k} ${x.a}/${x.b}`).join(' · ')}</p>
          ))}
        </section>
      )}
      <ul className="list">
        {s.samples.map(x => (
          <li key={x.id} className="col">
            <div className="between"><b>{x.title}</b><span className="badge cool">Skor {x.score}</span></div>
            <small>{x.brand} · {x.category} · {x.attrs.color} · {x.attrs.fabric} · {x.attrs.fit}</small>
            <div className="chips static">
              {STATUSES.map(st => <button key={st} className={x.status === st ? 'on' : ''} onClick={() => upd(x.id, st)}>{st}</button>)}
            </div>
            <button className="link" onClick={() => s.setSamples(s.samples.filter(y => y.id !== x.id))}>Sil</button>
          </li>
        ))}
        {!s.samples.length && <p className="empty">Henüz numune yok. Radar'dan bir ürüne dokunup “Numune planına ekle” deyin.</p>}
      </ul>
    </>
  );
}
