import type { Product } from './types';
import type { Verdict } from './scoring';

export const Spark = ({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) => {
  const w = 120, h = 32, max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden><polyline fill="none" stroke={color} strokeWidth="2" points={pts} /></svg>;
};

export const Badge = ({ v }: { v: Verdict }) => <span className={`badge ${v.tone}`}>{v.label}</span>;

export const ScoreRing = ({ value }: { value: number }) => {
  const r = 18, c = 2 * Math.PI * r;
  const col = value >= 70 ? 'var(--hot)' : value >= 55 ? 'var(--warm)' : value >= 40 ? 'var(--cool)' : 'var(--cold)';
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" role="img" aria-label={`Skor ${value}`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">{value}</text>
    </svg>
  );
};

export const Bar = ({ value, label }: { value: number; label: string }) => (
  <div className="bar-row">
    <span className="bar-label">{label}</span>
    <div className="bar"><i style={{ width: `${value}%` }} /></div>
    <span className="bar-val">{Math.round(value)}</span>
  </div>
);

export const originFlag = (o: string) =>
  ({ 'Türkiye': '🇹🇷', Fas: '🇲🇦', Portekiz: '🇵🇹', 'Çin': '🇨🇳', 'Bangladeş': '🇧🇩', Hindistan: '🇮🇳', Vietnam: '🇻🇳', 'Mısır': '🇪🇬', Pakistan: '🇵🇰', 'Kamboçya': '🇰🇭', 'Sri Lanka': '🇱🇰', Endonezya: '🇮🇩', 'İspanya': '🇪🇸', Myanmar: '🇲🇲' } as Record<string, string>)[o] ?? '🌍';

export const money = (p: Product) => `${({ EUR: '€', USD: '$', GBP: '£', TRY: '₺' } as Record<string, string>)[p.currency ?? 'EUR'] ?? p.currency + ' '}${p.price.toFixed(2)}`;

export const proximity = (p: Product) => ['Türkiye', 'Fas', 'Portekiz', 'İspanya'].includes(p.origin);
