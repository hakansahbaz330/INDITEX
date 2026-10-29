# Otomatik günlük veri (GitHub Actions + Apify)

Akış: her gün GitHub, Apify'daki **kayıtlı görevinizi** çalıştırır → sonuç `data/snapshots.json` dosyasına eklenir → uygulama güncellenip yayınlanır. Bilgisayar veya sunucu gerekmez.

## Bir kerelik kurulum (telefondan yapılabilir)
1. **Apify'da görev (Task) oluşturun.** Aktör sayfasında istediğiniz ayarları yapın (marka, ülke, kategori, ürün sayısı), sonra **"Save as a new task"**. Görev sayfasının adresindeki kimliği veya `kullanici~gorev-adi` adını not edin. Görevin "Run options" bölümünde "Maximum cost per run"ı bir sınıra çekin.
2. **Apify token oluşturun:** Settings → API & Integrations.
3. **GitHub'da gizli anahtarları ekleyin:** github.com/hakansahbaz330/INDITEX → Settings → Secrets and variables → Actions → New repository secret:
   - `APIFY_TOKEN` = token
   - `APIFY_TASK_ID` = görev kimliği
4. **Pages'i açın:** Settings → Pages → Source: **GitHub Actions**.
5. **İlk çalıştırma:** Actions sekmesi → "Günlük veri çekimi ve yayın" → Run workflow. Bitince Pages adresi (Settings → Pages) uygulamanız olur. Telefonda "Ana ekrana ekle" yapın.

## Güvenlik ve gizlilik
- Token yalnızca GitHub Secrets'ta durur, uygulamaya veya depoya yazılmaz.
- **Depo herkese açık.** `data/snapshots.json` (Inditex'in herkese açık ürün bilgileri ve türetilen sinyaller) ve yayınlanan site herkesçe görülebilir. Gizli kalması gerekiyorsa depoyu özel yapın; ancak özel depoda Pages ücretli GitHub planı gerektirir.
- Numuneleriniz ve ayarlarınız sitede değil, yalnızca kendi tarayıcınızda saklanır.

## Maliyet
Apify ücreti görevin ürün sayısına göre ayarlanır; `APIFY_MAX_USD` (varsayılan 2 dolar) her çalıştırmanın üst sınırıdır. GitHub Actions bu kullanım için ücretsiz kotada kalır.
