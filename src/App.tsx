import { useEffect, useState } from 'react';
import { fromSnap } from './apifyImport';
import { useStore } from './store';
import Radar from './pages/Radar';
import Analysis from './pages/Analysis';
import Calendar from './pages/Calendar';
import Samples from './pages/Samples';
import More from './pages/More';

const TABS = [
  { id: 'radar', label: 'Radar', icon: '📡' },
  { id: 'analiz', label: 'Analiz', icon: '📊' },
  { id: 'takvim', label: 'Takvim', icon: '🗓️' },
  { id: 'numune', label: 'Numune', icon: '🧵' },
  { id: 'daha', label: 'Daha', icon: '⚙️' },
] as const;

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('radar');
  const [auto, setAuto] = useState('');
  // Otomatik günlük veri varsa (GitHub Actions'ın yazdığı dosya) onu yükle.
  const { setSnap, setProducts } = store;
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
        <span className="count-pill">{store.products.length} ürün{auto ? ` · güncelleme ${auto}` : ''}</span>
      </header>
      <main>
        {tab === 'radar' && <Radar s={store} go={() => setTab('daha')} />}
        {tab === 'analiz' && <Analysis s={store} go={() => setTab('daha')} />}
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
