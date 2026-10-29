# Inditex Sipariş Öngörü Platformu – Araştırma ve Yol Haritası

## 1. Temel gerçek
Inditex'in asıl talep verisi (RFID etiketli ürünlerin mağaza kasa/stok verisi, ~350 kişilik tasarım ekibine giden günlük geri bildirim) **dışarıdan erişilemez**. Bu yüzden hedef, markanın **dışarıdan gözlemlenebilen davranışlarından** talebi tahmin etmektir. Tahmin ne kadar iyi olursa olsun kesin değildir; amaç onay oranını rastgele seviyenin üzerine çıkarmaktır.

Kritik içgörü: Inditex yakın tedarik (Türkiye, Fas, Portekiz, İspanya) modeliyle çalışır; küçük partilerle test eder, satan ürünü hızlıca yeniden sipariş eder. Bu, **satışı başlamış ürüne benzer, hızlı teslim edilebilen** bir numunenin en yüksek onay şansına sahip olduğu anlamına gelir. Türkiye bu ağın en büyük hub'larından biridir.

## 2. Sinyaller (uygulamadaki skor motoru)
| Sinyal | Ne anlatır | Kaynak |
|---|---|---|
| Beden tükenme oranı | Anlık talep baskısı | Marka sitesi stok durumu |
| Tükenme hızı | İlk bedenin kaç günde bittiği | Haftalık anlık görüntü karşılaştırması |
| Reklam yoğunluğu | Markanın bütçe ayırdığı ürünler | Meta Reklam Kitaplığı (resmi, açık) |
| Arama trendi | Tüketici ilgisi, erken sinyal | Google Trends, Pinterest Trends |
| Yeniden stok | Marka "tuttu" kararı verdi | Site gözlemi |
| İndirimsiz satış | Fiyat direnci = talep | Fiyat geçmişi |
| Yenilik | Taze ve yeni lansman | Yeni gelenler sayfası |

Ağırlıklar uygulamada ayarlanabilir; **gerçek hedef, kendi onay/ret geçmişinizle ağırlıkları kalibre etmektir.**

## 3. Veri kaynakları ve risk
- **Düşük riskli ve resmi:** Meta Reklam Kitaplığı, Google Trends, Pinterest Trends, fuarlar (Premiere Vision, Pitti), gümrük istatistikleri (TÜİK, Eurostat, Trademap).
- **Orta risk:** Marka sitesinin stok/sıralama verisi. Zara sitesi bot koruması kullanır ve kullanım şartları otomatik toplamayı kısıtlayabilir. Önerilen yol: manuel gözlem + CSV içe aktarma, veya hukuki uygunluğu doğrulanmış bir sağlayıcı. Bu aşamada hukuk danışmanı görüşü alın.
- **Ücretli, kurumsal:** WGSN (podyum, sosyal, raf, arama, duygu analizi), EDITED (fiyat/stok), Heuritech (sosyal görsel tanıma). Bütçe varsa API ile bağlanır.
- **En değerli veri:** Kendi numune onay/ret geçmişiniz ve alıcı temsilcinizden gelen geri bildirim. Uygulamadaki *Numune* sekmesi bunu biriktirir.

## 4. Operasyonel strateji (veriden bağımsız)
1. **Takvimi geri sar:** Tasarım→numune→onay→üretim→sevk ≈ 5 ay. Bugün hangi kategori 5 ay sonra zirvede? (Takvim sekmesi)
2. **20 numunede portföy dengesi:** ~%60 kanıtlanmış satıcıya benzer (düşük risk), ~%30 trend varyasyonu, ~%10 deneysel.
3. **Hız farkı yarat:** Referans üründen sonra en kısa sürede numune; Inditex'te trend penceresi kısadır.
4. **Kumaş/renk stoğu:** Skoru yüksek kategorilerde kumaş opsiyonlarını önceden hazırda tut; numune süresi kısalır.
5. **Fiyat konumu:** Rakip üretim ülkesi dağılımına bakıp (Analiz sekmesi) fiyat ve termin teklifini ayarla.
6. **Geri bildirim döngüsü:** Her ret nedenini kaydet (fiyat, kalıp, kumaş, zamanlama).

## 5. Fazlar
- **Faz 0 (bu sürüm):** Skor motoru, radar, analiz, takvim, numune takibi, CSV/JSON içe aktarma. PWA, telefona kurulabilir. *Veriler şu an demodur.*
- **Faz 1 (1–2 ay):** Meta Reklam Kitaplığı ve Google Trends otomatik çekimi; haftalık snapshot saklama (sunucu + veritabanı).
- **Faz 2 (3–4 ay):** Stok/sıralama gözlemi için uygun veri kaynağı; bildirimler ("X ürünü tükenmek üzere").
- **Faz 3 (5–6 ay):** Kendi onay geçmişinizle ML ile onay olasılığı tahmini.
- **Faz 4 (6+ ay):** Görsel benzerlik, ürün fotoğrafından otomatik özellik çıkarımı ve tasarım brief'i.

## 6. Başarı ölçütleri
Onay oranı (hedef: mevcut ~%5'in 2–3 katı), numune başına sipariş adedi, referanstan numune gönderimine kadar gün, tahminlerin isabet oranı.

## 7. Araştırma notları ve sınırlar
Rakamlar (ör. yakın tedarik payı, Morocco'nun tedarikçi sayısında öne geçmesi) ikincil basın kaynaklarına dayanır (Modaes, Just-Style) ve yıllara göre değişir; Inditex ülke bazlı hacim açıklamaz. Karar vermeden önce doğrulayın.
