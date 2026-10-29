// Anlık görüntü kaydı ve sinyal türetme (saf fonksiyonlar; hem sunucu hem tarayıcı kullanır).
export const today = () => new Date().toISOString().slice(0, 10);
export const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/** Haritalanmış ürünleri bugünün anlık görüntüsü olarak kaydeder. */
export function record(db, items, date = today()) {
  for (const it of items) {
    const e = (db.items[it.id] ??= { meta: {}, snaps: [] });
    e.meta = { demand: it.demand, currency: it.currency, gender: it.gender, rank: it.rank, brand: it.brand, name: it.name, category: it.category, color: it.color, composition: it.composition, origin: it.origin, launched: it.launched, imageUrl: it.image };
    const snap = {
      d: date, total: it.sizes.length, out: it.sizes.filter(s => s.state === 'out').length,
      low: it.sizes.filter(s => s.state === 'low').length, price: it.price, orig: it.originalPrice,
    };
    const i = e.snaps.findIndex(s => s.d === date);
    if (i >= 0) e.snaps[i] = snap; else e.snaps.push(snap);
    e.snaps.sort((a, b) => a.d.localeCompare(b.d));
  }
  db.syncs.push({ d: date, n: items.length });
  db.syncs = db.syncs.slice(-400);
}

const ICON = { Triko: '🧶', Denim: '👖', Pantolon: '👖', Gömlek: '👔', Elbise: '👗', Etek: '🪭', 'Ceket & Mont': '🧥', Tişört: '👕', Sweatshirt: '🧢', 'Takım & Set': '🧵' };

/** Anlık görüntü geçmişinden uygulama sinyallerini türetir. */
export function derive(db, now = today()) {
  return Object.entries(db.items).map(([id, e]) => {
    const s = e.snaps, first = s[0], last = s[s.length - 1];
    const startDay = e.meta.launched || first.d;
    const total = Math.max(1, last.total);
    // İlk görüntüde zaten tükenmişse tükenme zamanı bilinmez; hızı şişirmemek için null.
    const firstOut = s.find(x => x.out > 0 || x.low > 0);
    const soldOutDays = !firstOut ? null : firstOut === first && !e.meta.launched ? null : Math.max(1, dayDiff(startDay, firstOut.d));
    let restocks = 0;
    for (let i = 1; i < s.length; i++) if (s[i - 1].out > s[i].out && s[i - 1].out > 0) restocks++;
    const maxPrice = Math.max(...s.map(x => x.orig ?? x.price ?? 0), 0);
    const markdown = maxPrice && last.price ? Math.max(0, 1 - last.price / maxPrice) : 0;
    const hist = s.slice(-12).map(x => Math.round(((x.out + x.low * 0.5) / Math.max(1, x.total)) * 100));
    while (hist.length < 12) hist.unshift(hist[0] ?? 0);
    return {
      id, brand: e.meta.brand, name: e.meta.name, category: e.meta.category, gender: e.meta.gender ?? 'Kadın',
      color: e.meta.color, fabric: e.meta.composition, fit: '-', price: last.price ?? 0, currency: e.meta.currency ?? 'EUR', demand: e.meta.demand,
      origin: e.meta.origin, daysOnline: Math.max(0, dayDiff(startDay, now)),
      sizesTotal: total, sizesOut: Math.min(total, last.out + Math.round(last.low * 0.5)),
      soldOutDays, restocks, markdown: Math.round(markdown * 100) / 100,
      adIntensity: 0, searchTrend: 0, trendDelta: 0, history: hist,
      image: ICON[e.meta.category] ?? '🧵', imageUrl: e.meta.imageUrl, snapshots: s.length,
    };
  });
}

/** Dosya büyümesin: her ürün için ilk anlık görüntü + son N tanesi kalır. */
export function prune(db, keep = 60) {
  for (const e of Object.values(db.items)) if (e.snaps.length > keep) e.snaps = [e.snaps[0], ...e.snaps.slice(-(keep - 1))];
  return db;
}
