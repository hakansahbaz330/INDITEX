# Veri Kaynakları Araştırması (2. tur)

> Not: Bu oturumda apify.com'a erişim engelliydi; aktör bilgileri arama özetlerinden alınmıştır. Alan adları, fiyat ve çıktı şemaları kullanmadan önce aktörün kendi sayfasından doğrulanmalıdır.

## 1. Apify tipi hazır "aktörler" (ekran görüntüsündekiler)
| Aktör | Ne veriyor | Maliyet (ilan edilen) | Not |
|---|---|---|---|
| sian.agency / Inditex Product Scraper | 7 marka, tek şema, 58 sütun; fiyat, beden, stok, barkod, 200+ ülke mağazası | ~$3.15 / 1000 ürün | Tek aktörle tüm Inditex. Stok alanının canlı stok mu katalog bayrağı mı olduğu belirsiz |
| rl1987 / Zara API Scraper | Zara katalog, renk, beden, malzeme, görsel, fiyat | — | Ters mühendislikle çözülmüş mobil API kullanıyor: kırılgan, kullanım şartı riski daha yüksek |
| studio-amba / Zara Scraper | Ad, fiyat, stok, kategori, görsel | ~$1.20 / 1000 sonuç | Çok az kullanıcı (2) |
| ParseForge / khadinakbar / scraptivo Zara | in_stock, low_on_stock, out_of_stock, coming_soon gibi durumlar | değişken | Zara'ya özel |

**Önemli sınır:** Zara'nın canlı mağaza stoğu uç noktası oturum anahtarı gerektirir; aktörlerin çoğu bunu kapsam dışı bırakır. Dolayısıyla "stok" çoğunlukla **beden bazında katalog durumudur**, mağaza bazında adet değildir. Bu bizim için yeterli: `low_on_stock` ve `out_of_stock` geçişlerini günlük kaydedip tükenme hızını kendimiz hesaplarız.

## 2. Bu veri işimize yarar mı?
**Evet, şu alanlarda:**
- Beden bazında tükendi / azaldı durumu → tükenme oranı ve hızı (skorun en ağır iki bileşeni)
- Fiyat ve indirim geçmişi → fiyat direnci
- Ürünün listede ilk görüldüğü gün → yenilik, yeniden stok tespiti
- Kumaş içeriği, renk, kategori → hangi özellik kazanıyor
- Ülke farkı → Türkiye/İspanya/Almanya pazarında hangi ürün nerede hızlı gidiyor

**Hayır, şunlar için işe yaramaz:**
- Gerçek satış adedi veya sipariş miktarı (yalnızca vekil sinyal)
- Mağaza bazlı gerçek stok adedi
- Hangi fabrikada üretildiği. Yalnızca ürün sayfasında gösteriliyorsa ülke ("Made in"); aktörün bunu verip vermediğini doğrulamadım
- "Çok satan" etiketi: Zara site içi satış sıralamasını açıkça yayımlamaz. Sıralama bir ipucudur, kanıt değil

**En önemli nokta:** Tek bir anlık görüntü değersiz, **günlük/haftalık zaman serisi** değerlidir. Tükenme hızı ancak art arda anlık görüntü alarak hesaplanır. Bu yüzden veriyi bir kez çekmek yerine zamanlanmış çekim ve kendi veritabanımız gerekir.

## 3. Resmi API'ler ve anahtarlar
| Kaynak | Durum | Anahtar/Erişim |
|---|---|---|
| Meta Ad Library API | Çalışıyor. AB/İngiltere'de ticari reklamları da döndürür (DSA). Diğer ülkelerde yalnızca siyasi/sosyal reklam | Facebook geliştirici hesabı, kimlik ve konum doğrulaması, kullanıcı erişim jetonu (uzun ömürlü ~60 gün; yenileme gerekir) |
| Google Trends API | **Alpha (Temmuz 2025)**, başvuruyla sınırlı, üretim garantisi yok. 1800 gün, bölge kırılımı | Başvuru gerekli. pytrends Nisan 2025'te arşivlendi, güvenilir değil |
| Pinterest API (trending keywords) | `GET /v5/trends/keywords/{region}/top/{trend_type}`, bölge ve ilgi filtreli, haftalık/aylık/yıllık büyüme | Geniş erişime açık değil; uygulama onayı ve OAuth gerekiyor (üçüncü taraf iddiası, doğrulayın). Yalnızca bugünün verisi |
| TikTok Creative Center | Ücretsiz web arayüzü; trend hashtag, ürün, reklam örneği | API yok; "Top Ads" yalnızca örneklem |
| TÜİK, Eurostat, Trademap | Resmi dış ticaret istatistikleri | Ücretsiz |

## 4. Ticari fiyat/stok istihbarat sağlayıcıları
Bright Data (hazır veri setleri), Retail Scrape, Senkrondata, DataWeave, Hir Infotech, EDITED, WGSN, Heuritech. Çoğu özel teklif usulü; kapsam iddiaları satıcı beyanıdır. **Avantaj:** yasal sorumluluğu ve bakım yükünü üstlenirler. **Dezavantaj:** aylık maliyet genellikle yüksektir. Önce 2–3 teklif alın, Zara/Bershka'nın beden bazlı stok verisini sağlayıp sağlamadığını yazılı sorun.

## 5. Hukuki ve risk değerlendirmesi (hukuk danışmanı yerine geçmez)
- Herkese açık veri çekmek AB'de kendiliğinden yasak değil ancak veritabanı hakkı, sözleşme (kullanım şartları) ve kişisel veri kuralları devreye girebilir. Ürün kataloğu kişisel veri içermez, bu avantaj.
- Kullanım şartları Inditex siteleri için incelenmedi; otomatik toplamayı yasaklıyor olabilir. Yaptığım aramalarda Inditex'e özel bir karar bulamadım.
- Daha düşük riskli kullanım: kendi iç analiziniz için, düşük frekansla, yeniden dağıtmadan, alıcının sistemine yük bindirmeden.
- Daha yüksek risk: ters mühendislikle mobil API'ye erişen aktörler, oturum anahtarı kullanımı, yoğun çekim.
- **Ticari ilişki riski:** Alıcınızın sitesini toplamak, müşteri ilişkisini zedeleyebilir. Alıcı temsilcinizin bilmesi/onaylaması bu riski azaltır.

## 6. Önerilen mimari
1. Zamanlanmış çekim: Apify aktörü (sian.agency) → günde 1 (yeni gelenler + seçili kategoriler)
2. Webhook → bizim sunucu → veritabanında günlük anlık görüntüler
3. Türetilen sinyaller: ilk tükenme günü, tükenme hızı, yeniden stok, indirim başlangıcı
4. Meta Reklam Kitaplığı: haftalık, Zara/Bershka sayfaları, AB ülkeleri
5. Google Trends / Pinterest: erişim alındığında; o zamana kadar manuel
6. Uygulamaya aktarma: mevcut CSV/JSON şeması ile uyumlu bir uyarlayıcı

**Maliyet tahmini (varsayımlara dayalı, doğrulayın):** İlan edilen ~$3.15/1000 ürün ile günde 2000 ürün çekilirse ayda yaklaşık $190; haftada 2 kez çekilirse ayda yaklaşık $50. Tüm katalog günlük çekilirse bu tutar hızla artar, bu yüzden kapsamı daraltın.

## 7. Önerilen sıra
1. **Bu hafta:** sian.agency aktörünü ücretsiz deneme kredisiyle tek kategoride (ör. triko) çalıştırın, çıktı alanlarını doğrulayın (stok değeri, menşe, tarih).
2. Çıktıyı uygulamaya CSV olarak yükleyin. Uygulama zaten kabul ediyor.
3. İki hafta günlük çekim yapıp tükenme hızı sinyalinin gerçekten onaylanan numunelerle ilişkili olup olmadığına bakın.
4. İlişki varsa sunucu otomasyonuna geçin; yoksa ağırlıkları yeniden düşünün.
