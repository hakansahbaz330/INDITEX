import { useState } from 'react';
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
  const demo = store.products.some(p => p.demo);
  return (
    <div className="app">
      <header className="top">
        <div><b>Inditex Radar</b><small>Sipariş Öngörü Platformu</small></div>
        {demo && <span className="demo-pill" title="Gösterilen veriler örnektir">DEMO VERİ</span>}
      </header>
      <main>
        {tab === 'radar' && <Radar s={store} />}
        {tab === 'analiz' && <Analysis s={store} />}
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
