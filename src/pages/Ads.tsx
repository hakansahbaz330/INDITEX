import { useState } from 'react';
import { FOCUS_CATS, summarize } from '../../server/ads.js';
import type { AdsDB } from '../App';

interface Item { id: string; run: number; text: string; cats: string[]; platforms: string[]; reach: number | null; knit: boolean }
interface Sum { name: string; active: number; all: number; new7: number; medianDays: number; withText: number; knit: number; cats: Record<string, { n: number; weight: number }>; top: Item[]; fresh: Item[] }

const adLink = (id: string) => `https://www.facebook.com/ads/library/?id=${id}`;

function Setup() {
  return (
    <section className="card empty-state">
      <h3>Reklam verisi henüz yok</h3>
      <p className="hint">Uygulama Meta Reklam Kitaplığı’ndan seçtiğiniz markaların (Zara, Bershka, H&M, Mango ve diğerleri) aktif reklamlarını her gün otomatik çeker ve sizin ürün türünüze göre analiz eder.</p>
      <ol>
        <li>Meta geliştirici hesabı açıp Reklam Kitaplığı API erişimi alın (kimlik doğrulaması gerekir).</li>
        <li>Erişim anahtarını GitHub’a <b>META_ACCESS_TOKEN</b> adıyla gizli anahtar olarak ekleyin.</li>
        <li>Markaları <b>config/ad-brands.json</b> dosyasından seçin.</li>
        <li>Actions → “Günlük veri çekimi ve yayın” → Run workflow.</li>
      </ol>
      <p className="hint">Ayrıntılar: docs/REKLAM_KURULUM.md</p>
    </section>
  );
}

export default function Ads({ ads }: { ads: AdsDB | null }) {
  const [brand, setBrand] = useState('');
  const [focus, setFocus] = useState(true);
  if (!ads || !ads.brands?.length) return <Setup />;
  const now = new Date().toISOString().slice(0, 10);
  const sum = summarize(ads, now, { focus }) as Record<string, Sum>;
  const names = Object.keys(sum);
  const cur = sum[brand && sum[brand] ? brand : names[0]];
  const rows = names.map(n => sum[n]).sort((a, b) => b.active - a.active);
  const cats = Object.entries(cur.cats).sort((a, b) => b[1].weight - a[1].weight);
  const maxW = Math.max(1, ...cats.map(c => c[1].weight));
  const total = rows.reduce((a, s) => a + s.active, 0);

  return (
    <>
      <div className="chips static">
        <button className={focus ? 'on' : ''} onClick={() => setFocus(true)}>★ Odak: kadın dış giyim · örme</button>
        <button className={!focus ? 'on' : ''} onClick={() => setFocus(false)}>Tüm reklamlar</button>
      </div>
      <p className="hint">{focus ? `Yalnızca ${FOCUS_CATS.join(', ')} türleri; erkek/çocuk olduğu açıkça yazan reklamlar dışarıda.` : 'Markanın tüm aktif reklamları.'} Son güncelleme: {ads.updated}.</p>

      <section className="card">
        <h3>Markalar karşılaştırması ({total} reklam)</h3>
        <div className="cal">
          <table className="tbl">
            <thead><tr><th>Marka</th><th>Aktif</th><th>Pay</th><th>Yeni 7g</th><th>Medyan</th><th>Örme</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.name} onClick={() => setBrand(s.name)} className={s.name === cur.name ? 'sel' : ''}>
                  <td>{s.name}</td><td>{s.active}</td><td>{s.all ? `%${Math.round((s.active / s.all) * 100)}` : '—'}</td><td>{s.new7}</td><td>{s.medianDays} g</td><td>{s.knit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Pay: markanın tüm aktif reklamları içinde seçili türlerin oranı. Medyan: reklamın ortalama yayında kalma süresi. Bir satıra dokunarak markayı seçin.</p>
      </section>

      <section className="card">
        <h3>{cur.name}: ürün türü yoğunluğu</h3>
        <p className="hint">Reklam metninden çıkarıldı; uzun süre yayında kalan reklam daha çok sayılır. {cur.all - cur.withText > 0 ? `Bu markanın ${cur.all} reklamından bazılarında metin olmayabilir; metni olmayan reklam sınıflanamaz.` : ''}</p>
        {cats.length ? cats.map(([c, v]) => (
          <div className="bar-row" key={c}>
            <span className="bar-label">{c} <small>({v.n})</small></span>
            <div className="bar"><i style={{ width: `${(v.weight / maxW) * 100}%` }} /></div>
            <span className="bar-val">{Math.round((v.weight / maxW) * 100)}</span>
          </div>
        )) : <p className="hint">Bu markanın reklam metinlerinde seçili ürün türü bulunamadı.</p>}
      </section>

      <section className="card">
        <h3>{cur.name}: en uzun süredir yayında</h3>
        {cur.top.length ? (
          <ul className="plain">
            {cur.top.map(a => (
              <li key={a.id}>
                <b>{a.run} gün</b> · {a.text ? a.text.slice(0, 110) : <i>(metin yok)</i>}{' '}
                <a href={adLink(a.id)} target="_blank" rel="noreferrer">Meta’da aç</a>
                <br /><small>{a.cats.join(', ') || 'ürün türü belirsiz'}{a.knit ? ' · örme' : ''} · {a.platforms.join(', ')}{a.reach ? ` · ulaşım ${a.reach.toLocaleString('tr-TR')}` : ''}</small>
              </li>
            ))}
          </ul>
        ) : <p className="hint">Seçili türde aktif reklam yok.</p>}
      </section>

      {cur.fresh.length > 0 && (
        <section className="card">
          <h3>{cur.name}: son 7 günde başlayanlar</h3>
          <ul className="plain">
            {cur.fresh.map(a => (
              <li key={a.id}><b>{a.run === 0 ? 'bugün' : `${a.run} gün önce`}</b> · {a.text ? a.text.slice(0, 110) : <i>(metin yok)</i>} <a href={adLink(a.id)} target="_blank" rel="noreferrer">Meta’da aç</a></li>
            ))}
          </ul>
        </section>
      )}
      <p className="hint">Ürün skorundaki “Reklam yoğunluğu”, Inditex markalarının reklamlarındaki ürün türü yoğunluğundan hesaplanır. Reklamlar tek tek ürüne bağlanamaz, çünkü API hedef bağlantısını vermiyor.</p>
    </>
  );
}
