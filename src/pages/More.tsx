import { useState } from 'react';
import type { Store } from '../store';
import { CSV_TEMPLATE, parseImport } from '../store';
import { DEFAULT_WEIGHTS, WEIGHT_LABELS } from '../scoring';
import { makeSeed } from '../seed';
import type { Product, Weights } from '../types';

const SOURCES = [
  { n: 'Hazır toplayıcılar (Apify: Inditex Product Scraper vb.)', v: 'Yüksek', r: 'Orta-Yüksek', d: '7 marka, beden bazlı stok durumu, fiyat, kumaş. Stok çoğunlukla katalog durumudur, mağaza adedi değildir. Günlük çekimle tükenme hızı türetilir. Ters mühendislik kullananlar daha riskli.' },
  { n: 'TikTok Creative Center', v: 'Orta', r: 'Düşük', d: 'Ücretsiz; trend hashtag, ürün ve reklam örneği. API yok, elle takip.' },
  { n: 'Google Trends API (alpha)', v: 'Orta', r: 'Düşük', d: 'Resmi ama başvuru gerekli; üretim garantisi yok.' },
  { n: 'Marka sitesi: beden/stok durumu', v: 'Çok yüksek', r: 'Orta', d: 'Hangi bedenler/renkler tükendi, ne kadar sürede; en güçlü talep vekili. Kullanım şartlarını kontrol edin; manuel gözlem veya izinli sağlayıcı kullanın.' },
  { n: 'Marka sitesi: “Yeni gelenler” / sıralama', v: 'Yüksek', r: 'Orta', d: 'Ürünün ne zaman listeye girdiği, sıralamadaki yükselişi, yeniden stoklanma.' },
  { n: 'Marka sitesi: bileşim ve menşe', v: 'Yüksek', r: 'Düşük', d: 'Kumaş içeriği ve “Made in” — rakip üretim coğrafyası.' },
  { n: 'Meta Reklam Kitaplığı', v: 'Yüksek', r: 'Düşük', d: 'Resmi ve herkese açık. Markanın hangi ürünlere reklam bütçesi ayırdığı ve ne kadar süredir yayında olduğu.' },
  { n: 'Google Trends', v: 'Orta', r: 'Düşük', d: 'Ülke bazlı arama ilgisi; “wide leg pantolon”, “bordo triko” gibi terimlerin yükselişi.' },
  { n: 'Pinterest Trends / Predicts', v: 'Orta', r: 'Düşük', d: 'Erken sinyal: 3–6 ay önceden renk/silüet eğilimleri.' },
  { n: 'Instagram / TikTok', v: 'Orta', r: 'Orta', d: 'Zara/Bershka hesaplarının öne çıkardığı ürünler; influencer “haul” videoları.' },
  { n: 'Podyum ve fuarlar (Premiere Vision, Pitti)', v: 'Orta', r: 'Düşük', d: 'Kumaş, renk ve detay yönü; Inditex tasarım ekiplerinin ilham kaynağı.' },
  { n: 'Ticari analiz (WGSN, EDITED, Heuritech)', v: 'Yüksek', r: 'Düşük', d: 'Ücretli; fiyat, stok ve görsel tanıma. Kurumsal bütçeniz varsa API ile bu uygulamaya bağlanır.' },
  { n: 'Kendi verin: onaylı/reddedilen numuneler', v: 'Çok yüksek', r: 'Yok', d: 'Alıcı temsilcinizin geri bildirimi. Zamanla en değerli veri setiniz olur.' },
  { n: 'Gümrük / ticaret istatistikleri (TÜİK, Eurostat, Trademap)', v: 'Düşük-Orta', r: 'Düşük', d: 'Ülke bazlı hazır giyim akışı; makro talep.' },
];

const PHASES = [
  ['Faz 0 · Şimdi', 'Elle veri girişi / CSV içe aktarma, skor motoru, numune takibi. Haftalık manuel gözlem rutini.'],
  ['Faz 1 · 1–2 ay', 'Meta Reklam Kitaplığı ve Google Trends otomatik çekimi; haftalık anlık görüntü (snapshot) saklama.'],
  ['Faz 2 · 3–4 ay', 'Stok/sıralama gözlemi için hukuken uygun veri sağlayıcı veya izinli toplayıcı; sunucu + veritabanı.'],
  ['Faz 3 · 5–6 ay', 'Kendi onay geçmişinizle makine öğrenmesi: hangi özellik kombinasyonu onay alıyor tahmini.'],
  ['Faz 4 · 6+ ay', 'Görsel benzerlik: ürün fotoğrafından özellik çıkarımı, tasarım ekibine otomatik brief.'],
];

export default function More({ s }: { s: Store }) {
  const [tab, setTab] = useState<'kaynak' | 'yol' | 'ayar'>('kaynak');
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');
  const [srv, setSrv] = useState(() => { try { return JSON.parse(localStorage.getItem('ir.server') ?? '{}'); } catch { return {}; } });
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState('');
  const [health, setHealth] = useState<null | { tokenSet: boolean; inputOk: boolean; appKeySet: boolean; maxUsd: string; snapshots: number } | 'yok'>(null);
  const saveSrv = (v: { url?: string; key?: string }) => { setSrv(v); try { localStorage.setItem('ir.server', JSON.stringify(v)); } catch { /* yoksay */ } };
  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(`${srv.url ?? ''}${path}`, { ...init, headers: { 'x-app-key': srv.key ?? '' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
    return j;
  };
  const check = async () => {
    setBusy(true);
    try { setHealth(await call('/api/health')); } catch { setHealth('yok'); }
    setBusy(false);
  };
  const pull = async (sync: boolean) => {
    setBusy(true); setLive('');
    try {
      let info = '';
      if (sync) { const r = await call('/api/sync', { method: 'POST' }); info = `Apify'dan ${r.fetched} ürün çekildi (${r.skipped} atlandı). `; }
      const j = await call('/api/products');
      if (!j.products.length) { setLive(`${info}Sunucuda henüz kayıtlı ürün yok; mevcut veri korundu.`); setBusy(false); return; }
      s.setProducts(j.products as Product[]);
      setLive(`${info}${j.products.length} ürün yüklendi · ${j.syncs.length ? 'son çekim ' + j.syncs[j.syncs.length - 1].d : 'henüz çekim yok'}`);
    } catch (e) { setLive(`Hata: ${(e as Error).message}`); }
    setBusy(false);
  };

  const doImport = (replace: boolean) => {
    try {
      const items = parseImport(txt);
      s.setProducts(replace ? items : [...items, ...s.products.filter(p => !p.demo)]);
      setMsg(`${items.length} ürün içe aktarıldı.`); setTxt('');
    } catch { setMsg('Biçim hatalı. Şablonu kontrol edin.'); }
  };

  return (
    <>
      <div className="chips static">
        {([['kaynak', 'Veri kaynakları'], ['yol', 'Yol haritası'], ['ayar', 'Ayarlar']] as const).map(([k, l]) =>
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'kaynak' && (
        <>
          <p className="hint">Inditex’in iç satış verisi (RFID, mağaza kasa verisi) dışarıdan erişilemez. Bu yüzden dolaylı sinyalleri birleştiriyoruz. “Risk” sütunu kullanım şartı/hukuki risk seviyesidir.</p>
          {SOURCES.map(x => (
            <section className="card" key={x.n}>
              <div className="between"><b>{x.n}</b></div>
              <div className="chips static"><span>Değer: {x.v}</span><span>Risk: {x.r}</span></div>
              <p className="hint">{x.d}</p>
            </section>
          ))}
        </>
      )}

      {tab === 'yol' && PHASES.map(([t, d]) => <section className="card" key={t}><h3>{t}</h3><p className="hint">{d}</p></section>)}

      {tab === 'ayar' && (
        <>
          <section className="card">
            <h3>Canlı veri (sunucu)</h3>
            <p className="hint">Sunucu Apify'dan günlük çekim yapıp anlık görüntüleri saklar; tükenme hızı bu geçmişten hesaplanır. Aynı adresten açtıysanız adres alanını boş bırakın.</p>
            <input className="search" placeholder="Sunucu adresi (boş = bu adres)" value={srv.url ?? ''} onChange={e => saveSrv({ ...srv, url: e.target.value.replace(/\/$/, '') })} />
            <input className="search" type="password" placeholder="Uygulama parolası (APP_KEY, varsa)" value={srv.key ?? ''} onChange={e => saveSrv({ ...srv, key: e.target.value })} />
            <div className="row">
              <button className="btn" disabled={busy} onClick={() => pull(false)}>Kayıtlı veriyi yükle</button>
              <button className="btn ghost" disabled={busy} onClick={() => confirm("Apify çalıştırılır ve maliyet doğurur. Devam?") && pull(true)}>Şimdi Apify'dan çek</button>
            </div>
            <button className="btn ghost" disabled={busy} onClick={check}>Bağlantıyı kontrol et</button>
            {health === 'yok' && <p className="hint">✗ Sunucuya ulaşılamadı. Sunucuyu başlatın (<code>npm run server</code>) ve adresi kontrol edin.</p>}
            {health && health !== 'yok' && (
              <ul className="plain">
                <li>✓ Sunucu çalışıyor</li>
                <li>{health.tokenSet ? '✓ Apify token tanımlı' : '✗ APIFY_TOKEN tanımlı değil (ortam değişkeni olarak ekleyin)'}</li>
                <li>{health.inputOk ? '✓ server/input.json var' : '✗ server/input.json yok (Apify JSON sekmesinden kaydedin)'}</li>
                <li>{health.appKeySet ? '✓ Uygulama parolası açık' : '• Uygulama parolası (APP_KEY) tanımlı değil; internete açacaksanız ekleyin'}</li>
                <li>• Çalıştırma başına maliyet tavanı: ${health.maxUsd} · kayıtlı çekim: {health.snapshots}</li>
              </ul>
            )}
            {live && <p className="hint">{live}</p>}
          </section>
          <section className="card">
            <h3>Skor ağırlıkları</h3>
            {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map(k => (
              <label className="slider" key={k}>
                <span>{WEIGHT_LABELS[k]} <b>{s.weights[k]}</b></span>
                <input type="range" min={0} max={50} value={s.weights[k]} onChange={e => s.setWeights({ ...s.weights, [k]: +e.target.value })} />
              </label>
            ))}
            <button className="btn ghost" onClick={() => s.setWeights(DEFAULT_WEIGHTS)}>Varsayılana dön</button>
          </section>
          <section className="card">
            <h3>Veri içe aktar (CSV / JSON)</h3>
            <p className="hint">Kendi topladığınız veriyi yapıştırın. Şablon:</p>
            <pre>{CSV_TEMPLATE}</pre>
            <textarea rows={5} value={txt} onChange={e => setTxt(e.target.value)} placeholder="CSV veya JSON yapıştırın" />
            <div className="row">
              <button className="btn" disabled={!txt.trim()} onClick={() => doImport(true)}>Demo verinin yerine koy</button>
              <button className="btn ghost" disabled={!txt.trim()} onClick={() => doImport(false)}>Ekle</button>
            </div>
            {msg && <p className="hint">{msg}</p>}
          </section>
          <section className="card">
            <button className="btn ghost" onClick={() => { s.setProducts(makeSeed()); setMsg('Demo veri yüklendi.'); }}>Demo veriyi geri yükle</button>
            <button className="btn danger" onClick={() => { if (confirm('Tüm numuneler silinsin mi?')) s.setSamples([]); }}>Numuneleri sıfırla</button>
          </section>
        </>
      )}
    </>
  );
}
