# FitTakip Push Bildirim Worker'ı

Supplement hatırlatmalarının **uygulama tamamen kapalıyken de** gelmesini sağlar.
Cloudflare'in ücretsiz planında çalışır, aylık ücret ödemen gerekmez.

Bu klasör olmadan da uygulama çalışır — sadece hatırlatmalar yalnızca uygulama
açıkken tetiklenir. Kurulum tamamen isteğe bağlı.

## Nasıl çalışıyor?

1. Telefonun bildirim izni verince tarayıcı bir "abonelik adresi" üretir.
2. Uygulama bu adresi ve hatırlatma saatlerini Worker'a gönderir.
3. Worker her dakika uyanır, saati gelen hatırlatma var mı diye bakar.
4. Varsa bildirimi doğrudan telefonuna gönderir — uygulamanın açık olmasına gerek yok.

## Kurulum

### 1. Wrangler'ı kur ve giriş yap

```bash
npm install -g wrangler
wrangler login
```

### 2. VAPID anahtarlarını üret

```bash
cd worker
node generate-vapid-keys.mjs
```

Çıktıdaki iki değeri bir kenara not et. **Özel anahtarı (VAPID_PRIVATE_JWK)
asla git'e ekleme** — sadece aşağıdaki `wrangler secret put` komutuyla ver.

### 3. KV alanı oluştur

```bash
wrangler kv namespace create REMINDERS
```

Komutun verdiği `id` değerini `wrangler.toml` içindeki `kv_namespaces` bölümüne
yaz. Dosyada hâlihazırda bir id duruyor; o bu deponun sahibine ait, kendi
kurulumunu yapıyorsan kendi id'nle değiştir.

Id bir parola değil, yalnızca veritabanının adı — erişmek için yine hesaba ait
yetkili bir API anahtarı gerekiyor. Gizli olanlar aşağıdaki `secret put`
değerleri.

> Eski wrangler sürümlerinde komut `wrangler kv:namespace create REMINDERS` şeklinde.

### 4. Gizli değerleri ayarla

```bash
wrangler secret put VAPID_PUBLIC_KEY     # 2. adımdaki açık anahtar
wrangler secret put VAPID_PRIVATE_JWK    # 2. adımdaki özel anahtar (JSON metni)
wrangler secret put DEVICE_KEY           # kendi belirlediğin uzun bir parola
```

`DEVICE_KEY` senin belirlediğin bir paroladır — Worker adresini bilen yabancıların
sunucuna kayıt olmasını engeller. Uzun ve tahmin edilmesi zor bir şey seç,
uygulamaya da aynısını gireceksin.

### 5. Yayına al

```bash
wrangler deploy
```

Komut sonunda `https://fittakip-push.<hesabın>.workers.dev` gibi bir adres verir.

### 6. Uygulamayı bağla

Telefonda FitTakip'i aç → ☰ menü → **⚙️ Ayarlar → 🔔 Bildirim Sunucusu**:

1. Worker adresini yapıştır
2. `DEVICE_KEY` olarak belirlediğin parolayı gir
3. **Bağlan ve Bildirimleri Aç** → bildirim iznini ver
4. **🔔 Test Bildirimi Gönder** ile çalıştığını doğrula

Bunu bildirim almak istediğin **her cihazda ayrı ayrı** yapman gerekir.

## iPhone kullanıyorsan

iOS'ta web push yalnızca **ana ekrana eklenmiş** uygulamalarda çalışır:

- iOS 16.4 veya üstü gerekiyor
- Safari'de siteyi aç → Paylaş → **Ana Ekrana Ekle**
- Uygulamayı ana ekrandaki simgeden aç, bağlantıyı oradan kur

Safari sekmesinde açıkken bildirim **gelmez**. Android'de böyle bir kısıt yok.

## Ücretsiz plan yeterli mi?

Fazlasıyla. Günlük kullanım:

| Limit | Kullanımımız |
|---|---|
| Günde 100.000 istek | Cron her dakika → günde 1.440 |
| KV: günde 100.000 okuma | Günde ~1.440 |
| KV: günde 1.000 yazma | Günde 10-20 |
| 1 GB depolama | Birkaç KB |

## Sorun giderme

**"Cihaz anahtarı geçersiz"** — Uygulamaya girdiğin parola ile `DEVICE_KEY`
secret'ı aynı değil. `wrangler secret put DEVICE_KEY` ile yeniden ayarla.

**"Worker'da VAPID_PUBLIC_KEY tanımlı değil"** — 4. adımdaki secret'lar eksik.

**Test bildirimi geliyor ama zamanı gelince gelmiyor** — Cron tetikleyicisini
kontrol et: Cloudflare panelinde Worker → Settings → Trigger Events altında
`* * * * *` görünmeli. Bir de saat diliminin doğru gittiğinden emin ol;
uygulama telefonun saat dilimini otomatik gönderiyor.

**Hiç bildirim gelmiyor (iPhone)** — Uygulama ana ekrandan mı açıldı? Safari
sekmesinden kurulan abonelikler iOS'ta çalışmaz.

**Logları görmek için:**

```bash
wrangler tail
```

## Bildirimleri kapatmak

Uygulamada **Bağlantıyı Kes** butonu aboneliği hem telefondan hem sunucudan siler.
Worker'ı tamamen kaldırmak için: `wrangler delete`
