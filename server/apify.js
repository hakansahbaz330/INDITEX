// Apify API: kayıtlı görevi (task) veya aktörü başlatır, bitmesini bekler, sonuçları döndürür.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runAndFetch({ base = 'https://api.apify.com', token, taskId, actor, input, maxUsd = '2', pollMs = 5000, maxWaitMs = 30 * 60 * 1000, log = () => {} }) {
  if (!token) throw new Error('APIFY_TOKEN tanımlı değil');
  if (!taskId && !actor) throw new Error('APIFY_TASK_ID veya APIFY_ACTOR tanımlı değil');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const startUrl = `${base}/v2/${taskId ? `actor-tasks/${taskId}` : `acts/${actor}`}/runs?maxTotalChargeUsd=${maxUsd}`;
  const start = await fetch(startUrl, { method: 'POST', headers, body: JSON.stringify(input ?? {}) });
  if (!start.ok) throw new Error(`Apify başlatılamadı (${start.status}): ${(await start.text()).slice(0, 300)}`);
  const run = (await start.json()).data;
  log(`Çalıştırma başladı: ${run.id}`);
  const t0 = Date.now();
  let cur = run;
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(cur.status)) {
    if (Date.now() - t0 > maxWaitMs) throw new Error('Apify çalıştırması zaman aşımına uğradı');
    await sleep(pollMs);
    const r = await fetch(`${base}/v2/actor-runs/${run.id}`, { headers });
    if (!r.ok) throw new Error(`Durum sorgulanamadı (${r.status})`);
    cur = (await r.json()).data;
  }
  if (cur.status !== 'SUCCEEDED') throw new Error(`Apify çalıştırması başarısız: ${cur.status}`);
  const items = await fetch(`${base}/v2/datasets/${cur.defaultDatasetId}/items?format=json&clean=true`, { headers });
  if (!items.ok) throw new Error(`Sonuçlar alınamadı (${items.status})`);
  return items.json();
}
