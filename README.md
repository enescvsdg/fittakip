# FitTakip

Kişisel fitness, beslenme ve supplement takip uygulaması. Tek kullanıcılık,
çerçevesiz (vanilla JS), derleme adımı yok. GitHub Pages'ten yayınlanıyor.

**Canlı:** https://enescvsdg.github.io/fittakip/

Telefonda tarayıcıdan aç → paylaş menüsü → **Ana Ekrana Ekle**. Uygulama gibi
tam ekran açılır.

iPhone'da bu adım zorunlu: iOS bildirimlere yalnızca ana ekrana eklenmiş
uygulamalarda izin veriyor (iOS 16.4 ve üstü). Android'de tarayıcıdan da
çalışır ama ana ekrana eklemek yine daha iyi bir deneyim verir.

## Ne yapar

**Analiz** — Bugünün özeti (antrenman, kilo, beslenme, supplement kartları),
vücut kitle indeksi göstergesi, kilo takip grafiği, antrenman süreklilik serisi,
egzersiz bazlı güç gelişim grafiği, aktivite takvimi.

**Profil** — Boy, kilo, yaş; hedef belirleme; haftalık tartım geçmişi.

**Antrenman** — Kas grubu ve ekipmana göre hareket seçimi, haftanın günlerine
program kurma, set/tekrar/ağırlık işaretleyerek uygulama, kas haritası,
kardiyo planı ve antrenman kuralları notu.

**Beslenme** — 112 gıdalık yerel veritabanı (48'i temel gıda, 23'ü Türk
yemeği), öğün bazlı plan, USDA'dan arama, makro
hesaplama (protein / karbonhidrat / yağ), plan notları. Yumurta gibi tane ile
ölçülen gıdalar gram yerine adetle giriliyor; boy (S/M/L) seçilince ortalama
gramajı üzerinden hesaplanıyor.

**Supplement** — Zamanlamaya göre (Sabah, Aç Karnına, Antrenman Öncesi…) plan,
her takviyeye hatırlatma saati, günlük "aldım" işareti.

**Yapay zekâ ile program oluşturma** — Deneyim, hedef, ekipman, sakatlık,
beslenme tarzı, alerji ve takviye tercihlerini soran bir anket; sonunda
antrenman, beslenme ve takviye planı üretip önizlemeden sonra plana işliyor.
Günlük kalori ve makro hedefi uygulamada hesaplanıyor (Mifflin-St Jeor),
yapay zekâya bırakılmıyor. Gemini API anahtarı gerektirir.

**PDF'den program yükleme** — Diyetisyeninden gelen PDF'i yükle; yapay zekâ
antrenman, beslenme ve supplement planını çıkarıp önizleme olarak sunar,
onayladıklarını plana ekler. Gemini API anahtarı gerektirir.

**Bildirimler** — Hatırlatma saati geldiğinde telefona bildirim. Uygulama
kapalıyken çalışması için Cloudflare Worker kurulumu gerekir (aşağıda).

**Dokunma jestleri** — Sayfalar arasında parmakla geçiş: içerik parmağı anlık
takip ediyor, yeterince çekilmezse geri dönüyor. Başlık, kapsül ve zemin
yerinde kalır; yalnız içerik kayar. İki parmakla yakınlaştırma ve
yakınken gezinme; parmak kalkınca eski haline dönüyor (tarayıcının kendi zoom'u
kapalı, çünkü seviyesi koddan geri alınamıyor).

**Ayarlar** — Gemini API anahtarı, yedekleme ve geri yükleme, bildirim sunucusu
bağlantısı.

**Tema** — Telefonun sistem ayarını izler: gece derin lacivert, gündüz açık.

## Çevrimdışı çalışma — ne çalışır, ne çalışmaz

Service worker uygulamayı önbelleğe alır, yani **ilk açılıştan sonra** temel
takip özellikleri internetsiz çalışır: plan görüntüleme ve düzenleme, set
işaretleme, tartım ekleme, supplement işaretleme, tüm sayfalar.

İnternet gerektirenler:

| Özellik | Neden |
|---|---|
| Grafikler ve PDF okuma | Chart.js ve PDF.js harici CDN'den geliyor. İlk yüklemede önbelleğe alınırlar; o an ağ yoksa sonradan kullanılamazlar (uygulama çökmez, grafik çizilmez). |
| Gıda arama | USDA veritabanına istek atar |
| PDF'den program çıkarma | Google Gemini API'ye istek atar |
| Uygulama kapalıyken bildirim | Cloudflare Worker gönderir |

## Verilerin nereye gidiyor

Antrenman, beslenme, tartım ve supplement verilerinin tamamı telefonda,
`localStorage`'da tutulur. Kullanmadığın özellikler hiçbir yere veri göndermez.

Kullandığında dışarı çıkanlar:

| Ne zaman | Nereye | Ne |
|---|---|---|
| Bildirim sunucusunu bağladığında | **kendi** Cloudflare Worker'ın | Hatırlatma saati kurduğun supplementlerin adı, dozu, notu, zamanlaması ve saat dilimin. Bildirimi gönderebilmesi için sunucunun bunları bilmesi gerekiyor. |
| PDF'den program yüklerken | Google Gemini | PDF'in metni |
| Gıda ararken | USDA veritabanı | Aradığın gıda adı |

Bildirim sunucusu senin hesabında çalışır — verilerin bize veya üçüncü bir
tarafa değil, senin kurduğun Worker'a gider.

## Dosya yapısı

```
index.html      Tüm sayfaların işaretlemesi, açılış perdesi
style.css       Tema token'ları (gece/gündüz) ve tüm görünüm
storage.js      localStorage anahtarları ve okuma/yazma — app.js'ten ÖNCE yüklenir
utils.js        Tarih/sayı biçimleme, HTML kaçışı, form doğrulama
app.js          Uygulama mantığı
sw.js           Service worker: önbellek, push bildirimi, bildirime tıklama
manifest.json   PWA kimlik kartı
anatomy/        Kas haritası SVG'leri
worker/         Cloudflare Worker (bildirim sunucusu) — kendi README'si var
test/           Test takımları — kendi README'si var
```

`storage.js` ve `utils.js` hiçbir şeye bağımlı değil; herkes onları çağırır.
Yükleme sırası `index.html`'de belirlenir ve önemlidir: anahtar sabitleri
`app.js`'ten önce tanımlı olmalı.

## Bildirim sunucusu

Hatırlatmaların uygulama kapalıyken gelmesi için ücretsiz bir Cloudflare Worker
kurulumu gerekiyor. Kurulmazsa hatırlatmalar yalnızca uygulama açıkken çalışır.

Adım adım anlatım: [`worker/README.md`](worker/README.md)

Kurulduktan sonra uygulamada: ☰ → ⚙️ Ayarlar → 🔔 Bildirim Sunucusu.

## Gıda veritabanı

`foods.js` elle yazılmıyor, `tools/gida-topla.mjs` üretiyor. Türk yemekleri
malzemelerinden hesaplanıyor — bir dil modeline "karnıyarık kaç kalori" diye
sormak yerine tarifi toplayıp pişmiş ağırlığa bölüyoruz, çünkü modelin uydurduğu
kalori doğrulanamıyor ama tarif denetlenebiliyor. Tarif uygulamada da görünüyor.

Her kayıt bir süzgeçten geçiyor; geçemeyen dosyaya girmiyor. Ayrıntı:
[`tools/README.md`](tools/README.md)

## Test

```bash
npm run check       # söz dizimi ve yapılandırma — bağımlılık gerekmez
npm run test:unit   # birim ve worker testleri — bağımlılık gerekmez
npm test            # hepsi (arayüz testleri Playwright ister)
```

Ayrıntılar: [`test/README.md`](test/README.md)

Her push ve pull request'te GitHub Actions bunları çalıştırır.

## Yayınlama

`main` dalına yapılan her push GitHub Pages'e otomatik yayınlanır.

Güncellemenin telefona ulaşması için `sw.js` içindeki `CACHE_NAME` artırılmalı;
aksi halde eski sürüm önbellekten gelmeye devam eder. Telefonda yeni sürümün
devreye girmesi için uygulamayı iki kez aç-kapa etmek gerekir: birincisinde
yeni dosyalar iner, ikincisinde etkinleşir.

## Güvenlik notları

- Gemini API anahtarı cihazda saklanır ve yalnızca Google'a, PDF çözümlenirken
  gönderilir. Google tarafında anahtara kısıtlama tanımlanması önerilir.
- Yedek dosyası **kimlik bilgisi içermez**: Gemini anahtarı ve bildirim
  sunucusu bilgileri dışarıda bırakılır. Yeni cihazda elle girilmeleri gerekir.
- Worker'ın `DEVICE_KEY`, `VAPID_PUBLIC_KEY` ve `VAPID_PRIVATE_JWK` değerleri
  Cloudflare secret olarak tutulur, depoda bulunmaz.
