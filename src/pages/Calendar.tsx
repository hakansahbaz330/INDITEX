import type { Store } from '../store';

const M = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
// Mağaza satış zirvesi (Avrupa pazarı için genel yaklaşım; kendi verinizle güncelleyin). 0-3 yoğunluk.
const PEAK: Record<string, number[]> = {
  'Triko': [3, 2, 1, 0, 0, 0, 0, 0, 1, 3, 3, 3],
  'Ceket & Mont': [3, 2, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3],
  'Pantolon': [1, 1, 2, 3, 2, 2, 1, 2, 3, 3, 2, 1],
  'Denim': [1, 1, 2, 3, 3, 2, 2, 3, 3, 2, 1, 1],
  'Gömlek': [0, 1, 2, 3, 3, 3, 2, 1, 2, 2, 1, 0],
  'Elbise': [0, 0, 2, 3, 3, 3, 3, 2, 1, 1, 3, 3],
  'Tişört': [0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0],
  'Sweatshirt': [2, 1, 1, 0, 0, 0, 0, 1, 3, 3, 3, 2],
  'Etek': [0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 1, 2],
  'Takım & Set': [0, 1, 2, 3, 2, 1, 1, 1, 3, 2, 1, 2],
};
// Tasarım(1.5) + numune/onay(1.5) + sipariş-üretim-sevk(2) ≈ 5 ay
const LEAD = 5;

export default function Calendar({ s: _s }: { s: Store }) {
  const now = new Date().getMonth();
  const target = (now + LEAD) % 12;
  const todo = Object.entries(PEAK).filter(([, v]) => v[target] >= 2 || v[(target + 1) % 12] >= 3).map(([k]) => k);
  return (
    <>
      <section className="card accent">
        <h3>Şimdi ne tasarlamalı?</h3>
        <p className="hint">Tasarım → numune → onay → üretim → sevkiyat ≈ <b>{LEAD} ay</b>. Bugün başlarsanız ürün <b>{M[target]}</b> ayında rafta olur.</p>
        <div className="chips static">{todo.map(c => <span key={c}>{c}</span>)}</div>
      </section>
      <section className="card">
        <h3>Sezonsal talep takvimi</h3>
        <div className="cal">
          <div className="cal-row head"><span />{M.map((m, i) => <i key={m} className={i === now ? 'now' : ''}>{m}</i>)}</div>
          {Object.entries(PEAK).map(([cat, v]) => (
            <div className="cal-row" key={cat}>
              <span>{cat}</span>
              {v.map((x, i) => <i key={i} className={`h${x} ${i === target ? 'tgt' : ''}`} />)}
            </div>
          ))}
        </div>
        <p className="hint">◻ koyu = yüksek satış dönemi. Çerçeveli sütun: bugün başlayan işin rafa çıkış ayı. Değerler başlangıç tahminidir; gerçek satış geçmişinizle kalibre edin.</p>
      </section>
    </>
  );
}
