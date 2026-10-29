import type { Store } from '../store';
import { useLocal } from '../store';

const M = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const CATS = ['Ceket & Mont', 'Hırka', 'Yelek', 'Triko', 'Sweatshirt', 'Tişört', 'Gömlek', 'Pantolon', 'Denim', 'Elbise', 'Etek', 'Takım & Set'];
const LABEL = ['Yok', 'Düşük', 'Orta', 'Yüksek'];

// Takvim boş başlar. Satış yoğunluğunu siz işaretlersiniz (kendi satış/sipariş geçmişinizden).
export default function Calendar({ s: _s }: { s: Store }) {
  const [grid, setGrid] = useLocal<Record<string, number[]>>('ir.cal', () => ({}));
  const [lead, setLead] = useLocal<number>('ir.lead', () => 0);
  const now = new Date().getMonth();
  const cell = (c: string, m: number) => grid[c]?.[m] ?? 0;
  const bump = (c: string, m: number) => {
    const row = grid[c] ? [...grid[c]] : Array(12).fill(0);
    row[m] = (row[m] + 1) % 4;
    setGrid({ ...grid, [c]: row });
  };
  const marked = Object.values(grid).some(r => r.some(x => x > 0));
  const target = (now + lead) % 12;
  const todo = lead > 0 ? CATS.filter(c => cell(c, target) >= 2 || cell(c, (target + 1) % 12) >= 3) : [];

  return (
    <>
      <section className="card accent">
        <h3>Şimdi ne tasarlamalı?</h3>
        <label className="slider">
          <span>Tasarımdan rafa toplam süre (kendi sürenizi girin) <b>{lead ? `${lead} ay` : 'girilmedi'}</b></span>
          <input id="lead" type="range" min={0} max={9} value={lead} onChange={e => setLead(+e.target.value)} />
        </label>
        {lead > 0 && marked ? (
          <>
            <p className="hint">Bugün başlarsanız ürün <b>{M[target]}</b> ayında rafta olur. O ay yoğun satan kategoriler:</p>
            <div className="chips static">{todo.length ? todo.map(c => <span key={c}>{c}</span>) : <span>İşaretlediğiniz kategori yok</span>}</div>
          </>
        ) : (
          <p className="hint">Süreyi girin ve aşağıda satış dönemlerini işaretleyin. Öneri yalnızca sizin girdiğiniz bilgiden hesaplanır.</p>
        )}
      </section>
      <section className="card">
        <h3>Satış dönemleri</h3>
        <p className="hint">Bir hücreye dokunarak yoğunluğu değiştirin: Yok → Düşük → Orta → Yüksek. Kendi satış ve sipariş geçmişinize göre doldurun.</p>
        <div className="cal">
          <div className="cal-row head"><span />{M.map((m, i) => <i key={m} className={i === now ? 'now' : ''}>{m}</i>)}</div>
          {CATS.map(c => (
            <div className="cal-row" key={c}>
              <span>{c}</span>
              {M.map((m, i) => (
                <i key={m} role="button" aria-label={`${c} ${m}: ${LABEL[cell(c, i)]}`} className={`btn-cell h${cell(c, i)} ${lead > 0 && i === target ? 'tgt' : ''}`} onClick={() => bump(c, i)} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
