# Apify Canlı Veri Entegrasyonu

Akış: Apify aktörü → `server/` (token burada, ortam değişkeninde) → günlük anlık görüntüler (`server/data/snapshots.json`) → türetilmiş sinyaller → uygulama (Daha → Ayarlar → Canlı veri).

## Sizin yapacaklarınız
1. **Token oluşturun:** console.apify.com → Settings → API & Integrations → yeni token. Token'ı kimseyle paylaşmayın, sohbete yapıştırmayın.
2. **Girdiyi kaydedin:** aktör sayfasında "JSON" sekmesine geçin, içeriği kopyalayıp `server/input.json` olarak kaydedin (örnek: `server/input.example.json`). İlk deneme için tek marka (Zara), tek kategori, az ürün seçin.
3. **Ortam değişkenlerini verin:** `APIFY_TOKEN` (zorunlu), `APP_KEY` (önerilir; uygulama parolası), `APIFY_MAX_USD` (tek çalıştırma maliyet tavanı, varsayılan 2).
4. **Çalıştırın:** `npm run build && npm run server` → `http://localhost:8787`
5. **Doğrulayın:** uygulamada Daha → Ayarlar → "Şimdi Apify'dan çek". Sonra `/api/debug/sample` adresine bakın: aktörün gerçek alan adlarını gösterir. `server/map.js` içindeki `FIELDS` listesini bu adlara göre daraltın.
6. **Günlük çekim:** her gün aynı saatte `curl -X POST -H "x-app-key: ..." http://sunucu/api/sync` çağıran bir zamanlayıcı (cron) kurun. Tükenme hızı ancak art arda günlerin geçmişiyle hesaplanır; ilk hafta sinyaller zayıf olur.

## Bilinen sınırlar
- Aktörün alan adları doğrulanmadı; `map.js` aday adlarla çalışır. Eşleşmeyen ürünler atlanır (yanıtta `skipped`).
- Reklam yoğunluğu ve arama trendi bu kaynaktan gelmez; canlı veride 0 olur. Skorda bu iki ağırlığı Ayarlar'dan düşürün veya Meta/Google verisini sonraki fazda ekleyin.
- Cinsiyet ve kalıp bilgisi gelmiyorsa varsayılan ("Kadın", "-") kalır.
- İlk çekimde tüm ürünlerin "koleksiyonda gün" değeri 0'dır (aktör bir çıkış tarihi vermiyorsa).
- Sunucu tek kullanıcılı ve dosya tabanlıdır; çoklu kullanıcı için veritabanına geçin.
- Test: `npm run test:server` (sentetik veri ve sahte Apify sunucusu kullanır, token gerekmez).

## Gerçek çıktıdan öğrendiklerimiz (29.10.2026, 100 satırlık örnek, overview modu)
- **Üretim ülkesi geliyor:** `variants[].origin` (ör. "CHINA KONTINENTAL", "MAROKKO", "KAMBODSCHA"). Almanca yazılır; `map.js` Türkçeye çevirir. Örnekte Çin, Vietnam, Fas, Bangladeş, Kamboçya, Portekiz görüldü. Zara'da overview modunda yok.
- **Beden verisi:** Zara hariç markalarda `variants[]` içinde `size`, `is_buyable`, `back_soon` var. Zara overview'da beden yok, yalnızca ürün düzeyi `availability` ve "THE NEW" sıralaması (`grid_position`). **Zara için detail modu gerekir** (daha pahalı olabilir).
- **Tükendi tanımı (varsayım):** `back_soon=true` olan beden "şu an yok" sayılıyor. COMING_SOON ürünlerde tüm bedenler true olduğundan o ürünler kaydedilmiyor. Doğrulamak için aynı ürünü birkaç gün izleyin.
- **Çıkış tarihi var:** `availability_date` → "koleksiyonda gün" gerçek tarihle hesaplanır.
- **Dışarıda bırakılanlar:** Zara "LOOK" (Bundle) kombinleri, Zara Home, ayakkabı/aksesuar, iç giyim (`EXCLUDE_BRANDS`, `EXCLUDE_CATEGORIES` ile değiştirilir).
- **Gelmeyenler:** indirim alanları örnekte boş (`old_price` hep null), cinsiyet açık gelmiyor (bölüm adından tahmin), kalıp yok. Kumaş içeriği Almanca ("wolle").
- Örnekteki 9 satır `server/fixtures/sample.json` olarak testte kullanılıyor.
