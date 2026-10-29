# Reklam verisi (Meta Reklam Kitaplığı) kurulumu

Akış: her gün GitHub, Meta Reklam Kitaplığı API'sinden `config/ad-brands.json` içindeki markaların **aktif reklamlarını** çeker → `public/data/ads.json` → uygulamada **Reklam** sekmesi.

## Neyi analiz eder
- Marka karşılaştırması: aktif reklam sayısı, odaktaki ürün türlerinin payı, son 7 günde başlayanlar, medyan yayın süresi, örme/triko reklamı sayısı.
- Marka başına ürün türü yoğunluğu (reklam metninden; uzun süre yayında kalan reklam daha ağırlıklı).
- En uzun süredir yayında olan ve yeni başlayan reklamlar, her biri için Meta'da açma bağlantısı.
- Odak: **kadın dış giyim · örme** (ceket & mont, hırka, yelek, triko). Erkek/çocuk olduğu açıkça yazan reklamlar dışarıda tutulur. "Tüm reklamlar" düğmesiyle kapatılır.
- Inditex markaları için ürün skoruna giren **"Reklam yoğunluğu"** bu analizden gelir (marka içinde ürün türü bazında).

## Bir kerelik kurulum
1. **Kimlik doğrulama:** facebook.com/ads/library/api adresinde Reklam Kitaplığı API erişimi için kimliğinizi doğrulayın.
2. **Geliştirici uygulaması:** developers.facebook.com'da bir uygulama oluşturun; Graph API Explorer'dan kullanıcı erişim anahtarı üretin. Anahtar kısa ömürlüdür; uygulama kimliği ve gizli anahtarıyla uzun ömürlüye (yaklaşık 60 gün) çevirin (`/oauth/access_token?grant_type=fb_exchange_token&client_id=…&client_secret=…&fb_exchange_token=…`).
3. **GitHub gizli anahtarı:** Settings → Secrets and variables → Actions → `META_ACCESS_TOKEN`. Anahtarı sohbete veya depoya yazmayın.
4. **Markaları seçin:** `config/ad-brands.json` dosyasını GitHub'da düzenleyin. Marka için `pageId` (kesin) veya `search` (ada göre arama; sayfa adı markayı içeren reklamlar alınır) verin. Başlangıçta Zara (sayfa kimliği paylaştığınız bağlantıdan), Bershka, Pull&Bear, Stradivarius, Massimo Dutti, Oysho, H&M, Mango, Uniqlo ve Primark var.
5. **Çalıştırın:** Actions → "Günlük veri çekimi ve yayın" → Run workflow. Sonra her gün otomatik çalışır.

## Bilmeniz gerekenler
- **Anahtar yaklaşık 60 günde dolar.** Dolunca iş akışındaki reklam adımı hata verir; yeni anahtar üretip gizli anahtarı güncelleyin.
- **Ülkeler:** Ticari reklamlar yalnızca AB ve İngiltere için döner (config'teki `countries`). Türkiye ve ABD'de yalnızca siyasi reklamlar döner.
- **Gösterim ve harcama yok** (ticari reklamlarda). Süre ve yenilenme, talep için en iyi dolaylı sinyaldir.
- **Zara gibi markaların reklamları çoğunlukla görsel ve videodur, metni azdır.** Metni olmayan reklam ürün türüne ayrılamaz; uygulama her marka için bu oranı gösterir.
- **Reklam tek tek ürüne bağlanamaz:** API hedef bağlantısını vermez. Analiz marka ve ürün türü düzeyindedir.
- **Doğrulanmadı:** Bu modül sahte bir Graph API ile test edildi. Gerçek Meta API'sinin alan adları ve `search_page_ids` biçimi doğrulanamadı; kod birkaç biçimi sırayla dener. Hata olursa Actions günlüğündeki mesajı iletin.
- Depoda token saklanmaz; reklam dosyasındaki bağlantılar `access_token` içermez (Meta'da aç bağlantısı reklam kimliğinden oluşturulur).
