export default function Empty({ go }: { go: () => void }) {
  return (
    <section className="card empty-state">
      <h3>Henüz ürün verisi yok</h3>
      <p className="hint">Uygulama yalnızca sizin yüklediğiniz gerçek verilerle çalışır.</p>
      <ol>
        <li>Apify’da Inditex Product Scraper’ı çalıştırın.</li>
        <li>Sonucu JSON olarak indirin (Export → JSON).</li>
        <li>Daha → Ayarlar → “Apify dosyası yükle” ile seçin.</li>
      </ol>
      <button className="btn" onClick={go}>Dosya yüklemeye git</button>
    </section>
  );
}
