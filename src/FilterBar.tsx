import type { Store } from './store';
import { ALL, FOCUS, GENDERS, GROUPS, type Filters, passes } from './classify';

const same = (a: Filters, b: Filters) => a.gender === b.gender && a.knit === b.knit && a.group === b.group;

export default function FilterBar({ s }: { s: Store }) {
  const f = s.filters;
  const set = (p: Partial<Filters>) => s.setFilters({ ...f, ...p });
  const count = (x: Partial<Filters>) => s.products.filter(p => passes(p, { ...f, ...x })).length;
  return (
    <div className="fbar">
      <div className="chips">
        <button className={same(f, FOCUS) ? 'on' : ''} onClick={() => s.setFilters(FOCUS)}>★ Odak: kadın dış giyim · örme</button>
        <button className={same(f, ALL) ? 'on' : ''} onClick={() => s.setFilters(ALL)}>Hepsi</button>
      </div>
      <div className="chips">
        {(['Hepsi', ...GENDERS] as const).map(g => (
          <button key={g} className={f.gender === g ? 'on' : ''} onClick={() => set({ gender: g })}>{g} <small>{count({ gender: g })}</small></button>
        ))}
      </div>
      <div className="chips">
        <button className={f.knit ? 'on' : ''} onClick={() => set({ knit: !f.knit })}>Örme / Penye <small>{count({ knit: true })}</small></button>
        {(['Hepsi', ...GROUPS] as const).map(g => (
          <button key={g} className={f.group === g ? 'on' : ''} onClick={() => set({ group: g })}>{g} <small>{count({ group: g })}</small></button>
        ))}
      </div>
    </div>
  );
}
