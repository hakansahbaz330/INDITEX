// Meta Reklam Kitaplığı API'si (Graph API ads_archive). Token yalnızca ortam değişkeninden gelir.
const BASE_FIELDS = 'id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_creative_link_descriptions,languages,publisher_platforms';
const EU_FIELDS = ',eu_total_reach,target_ages,target_gender';

export async function fetchBrandAds({ base = 'https://graph.facebook.com', version = 'v21.0', token, brand, countries, maxPages = 20, log = () => {} }) {
  if (!token) throw new Error('META_ACCESS_TOKEN tanımlı değil');
  // Uç noktanın sayfa kimliği biçimi ve EU alanları doğrulanamadığı için sırayla denenen varyantlar
  const idFormats = brand.pageId ? [id => id, id => `[${id}]`] : [null];
  const fieldSets = [BASE_FIELDS + EU_FIELDS, BASE_FIELDS];
  let lastErr;
  for (const fmt of idFormats) for (const fields of fieldSets) {
    const p = new URLSearchParams({
      access_token: token, ad_type: 'ALL', ad_active_status: 'ACTIVE', limit: '100', fields,
      ad_reached_countries: JSON.stringify(countries),
    });
    if (fmt) p.set('search_page_ids', fmt(brand.pageId)); else { p.set('search_terms', brand.search ?? brand.name); p.set('search_type', 'KEYWORD_UNORDERED'); }
    let url = `${base}/${version}/ads_archive?${p}`;
    const all = [];
    try {
      for (let page = 0; page < maxPages && url; page++) {
        const r = await fetch(url);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const e = j.error ?? {};
          const err = new Error(`Meta API ${r.status} (kod ${e.code ?? '?'}): ${String(e.message ?? '').slice(0, 200)}`);
          err.code = e.code; throw err;
        }
        all.push(...(j.data ?? []));
        url = j.paging?.next ?? null;
      }
      log(`${brand.name}: ${all.length} aktif reklam`);
      return all;
    } catch (e) {
      lastErr = e;
      if (e.code === 190 || e.code === 102) throw e;     // token geçersiz/süresi dolmuş: denemenin anlamı yok
      log(`${brand.name}: deneme başarısız (${e.message.slice(0, 120)}), diğer biçim deneniyor`);
    }
  }
  throw lastErr;
}
