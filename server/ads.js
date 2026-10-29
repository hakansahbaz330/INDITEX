// Meta Reklam Kitaplığı verisini eşler, kategoriye ayırır ve özetler (saf fonksiyonlar; sunucu ve tarayıcı kullanır).

// Reklam metnindeki ürün türü kelimeleri (EN/DE/ES/FR/IT/TR). Sıra önemli: özel olan önce.
const CATS = [
  ['Hırka', /cardigan|c[aá]rdigan|hırka|strickjacke|cardigan/i],
  ['Yelek', /\bvest\b|waistcoat|gilet|\bweste\b|chaleco|yelek/i],
  ['Triko', /\bknit|sweater|jumper|pullover|strick|\bpunto\b|triko|kazak|maille|\bpull\b|maglione|tricot/i],
  ['Sweatshirt', /sweatshirt|hoodie|\bsudadera|felpa|sweat\b/i],
  ['Denim', /denim|\bjeans?\b|vaquero|\bjean\b/i],
  ['Ceket & Mont', /\bcoat|jacket|blazer|parka|puffer|bomber|trench|mantel|jacke\b|abrigo|chaqueta|cazadora|americana|\bveste\b|manteau|cappotto|giacca|ceket|\bmont\b|kaban|palto|outerwear|aussenbekleidung/i],
  ['Tişört', /t[\s-]?shirt|\btee\b|camiseta|\bshirt\b(?!.*blouse)|tişört|maglietta/i],
  ['Gömlek', /blouse|bluse|camisa|chemise|camicia|gömlek|hemd/i],
  ['Pantolon', /trouser|\bpants\b|pantal[oó]n|\bhose\b|pantolon|jogger|cargo|pantalon|pantaloni/i],
  ['Elbise', /\bdress|vestido|kleid|elbise|\brobe\b|abito/i],
  ['Etek', /\bskirt|falda|\brock\b|etek|jupe|gonna/i],
  ['Takım & Set', /\bsuit\b|co-?ord|\bset\b|traje|anzug|takım|tracksuit/i],
  ['Ayakkabı & Aksesuar', /shoe|sneaker|boot|zapato|schuh|\bbag\b|bolso|tasche|sandal|ayakkab|çanta|accessor/i],
];
export const categorize = text => {
  const out = [];
  for (const [name, re] of CATS) if (re.test(text)) out.push(name);
  return out;
};

// Cinsiyet ipucu (reklam metninde nadiren yazar; yoksa null)
const KIDS = /\b(kids?|children|boys?|girls?|baby|ni[ñn][oa]s?|kinder|enfants?|çocuk|bebek)\b/i;
const FEMALE = /\b(women|woman|womens|ladies|mujer|mujeres|damen|femme|donna|kadın|bayan)\b/i;
const MALE = /\b(men|man|mens|male|hombre|herren|homme|uomo|erkek)\b/i;
export const genderHint = text => (KIDS.test(text) ? 'Çocuk' : FEMALE.test(text) && !MALE.test(text) ? 'Kadın' : MALE.test(text) && !FEMALE.test(text) ? 'Erkek' : null);

/** Firmanın odağı: dış giyim ve triko türleri; erkek/çocuk olduğu açıkça belli reklamlar dışarıda. */
export const FOCUS_CATS = ['Ceket & Mont', 'Hırka', 'Yelek', 'Triko'];
export const inFocus = a => a.cats.some(c => FOCUS_CATS.includes(c)) && a.gender !== 'Erkek' && a.gender !== 'Çocuk';
const KNIT_WORDS = /knit|strick|punto|triko|örgü|maille|tricot|cardigan|hırka|fleece|teddy/i;
export const isKnitAd = text => KNIT_WORDS.test(text);

const day = d => (d ? String(d).slice(0, 10) : null);
const diffDays = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

/** access_token içeren sorgu parametrelerini siler (herkese açık dosyaya sızmasın). */
export const stripToken = url => {
  try { const u = new URL(url); u.searchParams.delete('access_token'); return u.toString(); } catch { return ''; }
};

export function mapAd(raw, brand) {
  if (!raw?.id) return null;
  const bodies = (raw.ad_creative_bodies ?? []).map(s => String(s).slice(0, 300));
  const titles = (raw.ad_creative_link_titles ?? []).map(s => String(s).slice(0, 160));
  const caps = (raw.ad_creative_link_captions ?? []).map(String);
  const descs = (raw.ad_creative_link_descriptions ?? []).map(s => String(s).slice(0, 200));
  const text = [...bodies, ...titles, ...descs, ...caps].join(' ');
  return {
    id: String(raw.id),
    brand,
    pageName: raw.page_name ?? brand,
    start: day(raw.ad_delivery_start_time ?? raw.ad_creation_time),
    stop: day(raw.ad_delivery_stop_time),
    bodies, titles, caps,
    platforms: raw.publisher_platforms ?? [],
    languages: raw.languages ?? [],
    reach: typeof raw.eu_total_reach === 'number' ? raw.eu_total_reach : null,
    ages: raw.target_ages ?? null,
    gender: raw.target_gender ?? null,
    cats: categorize(text),
    gender: genderHint(text),
    knit: isKnitAd(text),
  };
}

export const emptyAds = () => ({ updated: null, brands: [], ads: {} });

/** Bugün görülen reklamları işler; görülmeyenler pasif olur; 120 günden eskiler silinir. */
export function mergeAds(db, mapped, brandNames, today, keepDays = 120) {
  const seen = new Set();
  for (const m of mapped) {
    const prev = db.ads[m.id];
    db.ads[m.id] = { ...m, firstSeen: prev?.firstSeen ?? today, lastSeen: today, active: true };
    seen.add(m.id);
  }
  for (const [id, a] of Object.entries(db.ads)) {
    if (!seen.has(id) && brandNames.includes(a.brand)) a.active = false;
    if (diffDays(a.lastSeen, today) > keepDays) delete db.ads[id];
  }
  db.updated = today;
  db.brands = brandNames;
  return db;
}

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Marka bazlı özet. */
export function summarize(db, now = new Date().toISOString().slice(0, 10), { focus = false } = {}) {
  const out = {};
  for (const name of db.brands ?? []) out[name] = { name, active: 0, new7: 0, medianDays: 0, platforms: {}, cats: {}, top: [], fresh: [], withText: 0 };
  const days = {};
  for (const a of Object.values(db.ads ?? {})) {
    const s = out[a.brand]; if (!s || !a.active) continue;
    s.all = (s.all ?? 0) + 1;
    if (focus && !inFocus(a)) continue;
    const run = a.start ? diffDays(a.start, now) : 0;
    s.active++; (days[a.brand] ??= []).push(run);
    if (run <= 7) s.new7++;
    if (a.bodies.length || a.titles.length) s.withText++;
    for (const p of a.platforms) s.platforms[p] = (s.platforms[p] ?? 0) + 1;
    for (const c of a.cats) { const e = (s.cats[c] ??= { n: 0, weight: 0 }); e.n++; e.weight += 1 + Math.min(run, 60) / 60; }
    const item = { id: a.id, run, start: a.start, text: a.titles[0] || a.bodies[0] || '', cats: a.cats, platforms: a.platforms, reach: a.reach, knit: !!a.knit };
    s.top.push(item);
  }
  for (const s of Object.values(out)) {
    s.all = s.all ?? 0;
    s.knit = s.top.filter(x => x.knit).length;
    s.medianDays = median(days[s.name] ?? []);
    s.fresh = s.top.filter(x => x.run <= 7).sort((a, b) => a.run - b.run).slice(0, 10);
    s.top = s.top.sort((a, b) => b.run - a.run).slice(0, 10);
  }
  return out;
}

/** Ürün kategorisi başına reklam yoğunluğu (0–100), marka içinde normalize. */
export function intensityMap(db, now) {
  const sum = summarize(db, now), res = {};   // ürün kategorisi yoğunluğu için tüm reklamlar sayılır
  for (const s of Object.values(sum)) {
    const max = Math.max(0, ...Object.values(s.cats).map(c => c.weight));
    res[s.name] = {};
    if (max > 0) for (const [c, v] of Object.entries(s.cats)) res[s.name][c] = Math.round((v.weight / max) * 100);
  }
  return res;
}
