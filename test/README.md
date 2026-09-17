# Testler

```bash
npm install                        # yalnızca Playwright (arayüz testleri için)
npx playwright install chromium

npm test                           # hepsi
npm run test:unit                  # tarayıcı gerektirmeyenler (hızlı)
npm run test:ui                    # yalnızca arayüz
npm run check                      # söz dizimi + yapılandırma denetimi
```

`npm run check` ve `npm run test:unit` hiçbir bağımlılık istemez; sadece Node yeter.

## Yapı

| Klasör | İçerik | Tarayıcı |
|---|---|---|
| `unit/` | Saf yardımcılar. `app.js`'ten fonksiyonu söküp Node içinde çalıştırır. | hayır |
| `worker/` | Cloudflare Worker. Bellek içi KV ve gönderimi yakalayan sahte fetch kullanır; şifreleme ve VAPID imzası gerçekten çalışır. | hayır |
| `ui/` | Gerçek tarayıcıda gerçek uygulama. | evet |

Ortak parçalar:

- `server.mjs` — bağımlılıksız statik sunucu. Uygulamanın kendisi bağımlılıksız; test altyapısı bunu bozmasın diye elle yazıldı.
- `harness.mjs` — sonuç raporu, tohumlanmış sayfa açma, `app.js`'ten fonksiyon sökme.
- `worker/_ortam.mjs` — sahte KV, gerçek VAPID anahtarları, gönderim yakalayıcı.
- `ui/_veri.mjs` — paylaşılan örnek veriler.

## Yeni takım eklemek

İlgili klasöre `<ad>.test.mjs` koy; runner kendiliğinden bulur.

```js
export default async function ({ rapor, adres, browser }) {
  rapor.baslik('bir bölüm');
  rapor.kontrol('beklenen şey oldu', kosul, 'ölçülen değer');
}
```

`adres` çalışan sunucunun kökü, `browser` yalnızca `ui/` için açılır.

## Testin değeri

Bir test, düzeltmeden **önce başarısız olduğu** gösterilebiliyorsa bir şey kanıtlar.
`ui/xss.test.mjs` bunun örneği: kaçış düzeltmesinden önceki kodda ana sayfada kod
çalışıyor ve DOM'a yedi adet `onerror` taşıyan `<img>` giriyordu.

## Bilinen sınır

Chart.js ve PDF.js harici CDN'lerden geliyor; ağı kapalı ortamlarda yüklenmezler.
Uygulama bu durumda çökmüyor (`updateChart` ve `drawStrengthChart` kendilerini
koruyor), testler de bu hatayı görmezden geliyor.
