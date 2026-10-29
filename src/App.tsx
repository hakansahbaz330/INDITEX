import { useEffect, useMemo, useState } from 'react';
import { fromSnap } from './apifyImport';
import { intensityMap } from '../server/ads.js';
import Ads from './pages/Ads';
import { useStore } from './store';
import Radar from './pages/Radar';
import Analysis from './pages/Analysis';
import Calendar from './pages/Calendar';
import Samples from './pages/Samples';
import More from './pages/More';

export interface AdsDB { updated: string | null; brands: string[]; ads: Record<string, { id: string; brand: string; start: string | null; bodies: string[]; titles: string[]; platforms: string[]; reach: number | null; cats: string[]; active: boolean }>; }

const TABS = [
  { id: 'radar', label: 'Radar', icon: '📡' },
  { id: 'analiz', label: 'Analiz', icon: '📊' },
  { id: 'reklam', label: 'Reklam', icon: '📣' },
  { id: 'takvim', label: 'Takvim', icon: '🗓️' },
  { id: 'numune', label: 'Numune', icon: '🧵' },
  { id: 'daha', label: 'Daha', icon: '⚙️' },
] as const;

export default function App() {
  const base = useStore();
  const [ads, setAds] = useState<AdsDB | null>(null);
  useEffect(() => {
    fetch('./data/ads.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j?.brands?.length) setAds(j); }).catch(() => undefined);
  }, []);
  // Reklam verisi varsa ürünlerin reklam yoğunluğu, markanın reklamlarındaki ürün türü yoğunluğundan gelir
  const products = useMemo(() => {
    if (!ads) return base.products;
    const im = intensityMap(ads, new Date().toISOString().slice(0, 10)) as Record<string, Record<string, number>>;
    return base.products.map(p => (im[p.brand] ? { ...p, adIntensity: im[p.brand][p.category] ?? 0 } : p));
  }, [base.products, ads]);
  const store = { ...base, products };
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('radar');
  const [auto, setAuto] = useState('');
  // Otomatik günlük veri varsa (GitHub Actions'ın yazdığı dosya) onu yükle.
  const { setSnap, setProducts } = base;
  useEffect(() => {
    fetch('./data/snapshots.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(db => {
        if (!db?.items || !Object.keys(db.items).length) return;
        setSnap(db); setProducts(fromSnap(db));
        setAuto(String(db.syncs?.[db.syncs.length - 1]?.d ?? ''));
      })
      .catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="app">
      <header className="top">
        <div><b>Inditex Radar</b><small>Sipariş Öngörü Platformu</small></div>
        <span className="count-pill">{base.products.length} ürün{auto ? ` · güncelleme ${auto}` : ''}</span>
      </header>
      <main>
        {tab === 'radar' && <Radar s={store} go={() => setTab('daha')} />}
        {tab === 'analiz' && <Analysis s={store} go={() => setTab('daha')} />}
        {tab === 'reklam' && <Ads ads={ads} />}
        {tab === 'takvim' && <Calendar s={store} />}
        {tab === 'numune' && <Samples s={store} />}
        {tab === 'daha' && <More s={store} />}
      </main>
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
