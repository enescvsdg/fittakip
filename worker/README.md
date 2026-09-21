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

---

# Yönetim Paneli ve Veri Ajanları

Ajanlar veriyi toplar, sen onaylarsın, onaylananlar repoya işlenir. Hiçbir
kayıt onaydan geçmeden uygulamaya girmez.

## Kurulum (bir kez)

### 1. Panel anahtarını belirle

Uzun ve rastgele bir parola üret:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Çıkan metni bir yere kaydet, sonra secret olarak yükle:

```bash
cd worker
wrangler secret put ADMIN_KEY
```

Bu anahtar **repoya girmez.** Cihaz anahtarından (`DEVICE_KEY`) ayrıdır ve
biri diğerinin yerine geçmez.

### 2. Worker'ı dağıt

```bash
wrangler deploy
```

Artık iki zamanlayıcı var: dakikalık hatırlatma taraması ve gece 03:00'teki
veri ajanı turu.

### 3. Paneli aç

```
https://fittakip-push.<hesap-alt-adın>.workers.dev/admin
```

Tarayıcı kendi giriş penceresini açar. Kullanıcı adı önemsiz (`admin` yaz),
parola az önce ürettiğin `ADMIN_KEY`. Telefondan da aynı adres çalışır.

## Kullanım

Betikler Worker adresini ve panel anahtarını ortam değişkeninden okur:

```bash
export FITTAKIP_WORKER=https://fittakip-push.<hesap-alt-adın>.workers.dev
export FITTAKIP_ADMIN_KEY=<ADMIN_KEY ile aynı>
```

Windows PowerShell'de:

```powershell
$env:FITTAKIP_WORKER="https://fittakip-push.<hesap-alt-adın>.workers.dev"
$env:FITTAKIP_ADMIN_KEY="<ADMIN_KEY ile aynı>"
```

### Uygulamanın mevcut listesini gönder (ilk kullanımda şart)

```bash
npm run veri-gonder
```

Ajan "bu hareket bizde var mı" sorusunu buna bakarak yanıtlıyor. Göndermeden
çalıştırırsan ajan hata verip durur — 281 hareketin hepsini "yeni" sanıp onay
ekranını kullanılamaz hale getirmesin diye kasıtlı.

### Ajanları çalıştır

```bash
npm run veri-calistir
```

Gece 03:00'te zaten kendiliğinden çalışıyor; bu komut "şimdi bak" demek.

### Kuyruğu terminalden özetle

```bash
npm run veri-bekleyen
```

### Onayladıklarını uygulamaya işle

Panelde onay verdikten sonra:

```bash
npm run veri-al
npm test
git add -A && git commit -m "Egzersiz verisi güncellendi" && git push
```

`veri-al` şunları yapıyor:

1. Onaylanmış kayıtları Worker'dan çeker
2. `egzersizler.js`'in **üretilen bölümünü** baştan yazar (üst yarıdaki Türkçe
   sözlüklere dokunmaz)
3. Yazmadan önce ürettiği dosyayı çalıştırılabilir mi diye dener — bozuksa
   hiç yazmaz
4. `sw.js`'teki önbellek sürümünü artırır (yoksa telefondaki uygulama eski
   listeyi göstermeye devam ederdi)
5. İşlenen kayıtları kuyruktan düşürür ve Worker'a yeni listeyi gönderir

Commit ve deploy senin elinde — betik repoya yazmıyor, git'e dokunmuyor.

### Veri nerede duruyor

```
egzersizler.js
  ├─ üst yarı   → elle bakımlı: Türkçe kas ve ekipman sözlükleri
  └─ alt yarı   → veri-al üretiyor:
       EXERCISES      hareket listesi, mekâna göre
       EXERCISE_INFO  ikincil kaslar + adım adım talimat, hareket adına göre
```

İkisi ayrı duruyor çünkü 11 hareket hem "Evde" hem "Spor Salonunda" listesinde;
talimatı iki kez saklamanın anlamı yok.

Yeni hareketin hangi mekâna gideceği mevcut 281 kaydın gerçek dağılımından
çıkarıldı: `bands`, `medicine ball`, `exercise ball`, `foam roll` ve ekipmansız
hareketler eve; `barbell`, `cable`, `machine`, `ez curl bar`, `dumbbell` ve
`other` salona; `kettlebell` ikisine birden (mevcut veride tam 10/10 böyle).

## Ajanlar

| Ajan | Kaynak | Lisans | Ne yapar |
|---|---|---|---|
| Egzersiz | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (kamu malı) | 876 hareketi mevcut 281'le eşleştirir; talimat ve ikincil kas getirir |

Diğer üç ajan (Gıda, Analiz, Supplement) henüz yazılmadı.

### Egzersiz ajanı neden "eşleştirme" yapıyor?

Uygulamadaki 281 hareket zaten bu veri setinden derlenmiş ama sadeleştirilmiş
adlarla. Kaynakta `Barbell Bench Press` diye bir kayıt **yok** — yalnızca
`Barbell Bench Press - Medium Grip` var. 21 çeşit bench press kaydı arasından
doğrusunu bulmak gerekiyor.

Eşleştirme kasıtlı olarak muhafazakâr: ekipman ya da birincil kas tutmuyorsa
aday elenir, ve yalnızca **sona** eklenen niteleme kabul edilir.

```
"Barbell Bench Press"  ⊂  "Barbell Bench Press - Medium Grip"   kabul
"Lat Pulldown"         ⊂  "One Arm Lat Pulldown"                ret
"Preacher Curl"        ⊂  "Reverse Barbell Preacher Curls"      ret
```

Son ikisi gerçek veride çıktı: başa eklenen kelime hareketi değiştiriyor ve
kullanıcıya başka bir hareketin talimatı gösteriliyordu. Yanlış eşleşme,
eşleşmemekten kötü — eşleşmeyen kayıt panelde ayrı bir grupta, şüpheli
işaretiyle duruyor.

## Sorun giderme

**Panel 401 dönüyor** — `ADMIN_KEY` secret'ı yüklü mü? `wrangler secret list`
ile bak. Tarayıcıda kayıtlı yanlış bir giriş varsa gizli pencerede dene.

**Panel 500 dönüyor, "ADMIN_KEY secret eksik"** — 1. adım atlanmış.

**`npm run veri-calistir` "mevcut egzersiz listesi KV'de yok" diyor** — önce
`npm run veri-gonder` çalıştır.

**Ajan turu hata veriyor** — `wrangler tail` ile bak; ajan hataları
`[ajan]` önekiyle yazılıyor ve yutulmuyor.
