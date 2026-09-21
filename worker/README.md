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
| Analiz | Gemini | — | Antrenman geçmişini yorumlar |
| Supplement | 6 marka sitesi | — | Ürün sayfalarından besin değeri toplar |
| Gıda | USDA FoodData Central · Open Food Facts | Kamu malı · ODbL | Temel malzeme değerleri ve paketli ürünler |

### Gıda ajanı

İki kaynak, iki farklı iş yapıyor.

**USDA — yön tersine çevrildi.** USDA'yı tarayıp Türkçeye çevirmek yerine
Türkçe istek listesini biz veriyoruz (`tools/veri/usda-istek.json`, 94 kalem)
ve ajan her kalem için USDA'da karşılığını buluyor. Böylece isim çevirisi diye
bir sorun kalmıyor — "Beef, round, top round roast, boneless, separable lean
only, trimmed to 0" fat" çevrilecek bir şey değil — ve Türk mutfağında olmayan
hiçbir şey listeye girmiyor. Listedeki 56 kalem mevcut gıdaları zenginleştiriyor
(mikro besinler: lif, demir, kalsiyum, B12, sodyum, potasyum), 38'i yeni.

Ek kurulum:

```bash
wrangler secret put USDA_API_KEY
```

Ücretsiz anahtar: [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)

**Open Food Facts — Türkiye'de satılan paketli ürünler.** Adları zaten Türkçe,
paketin üstünde ne yazıyorsa o. Anahtar gerekmiyor. Bu kayıtlar `Paketli
Ürünler` diye ayrı bir kategoriye gidiyor: genel gıdaların arasına karışırsa
arama kutusu kullanılamaz hale geliyor. Hepsi şüpheli işaretli geliyor çünkü
veri gönüllü katkıya dayanıyor.

**ODbL künyesi bir lisans şartı**, nezaket değil: uygulamada Beslenme
sayfasında gösteriliyor ve testle tutuluyor. Künye yalnızca o kaynaktan
gerçekten veri varsa çıkıyor.

Doğrulama kuralı `tools/gida-dogrula.mjs`'den geliyor — Worker'a kopyalanmadı,
aynı dosya içe aktarılıyor ki kural tek yerde kalsın. `veri-al` onaylananları
`tools/veri/temel-gidalar.json`'a işleyip `gida-topla.mjs`'i çalıştırıyor;
o da hem `foods.js`'i üretiyor hem kapıyı bir kez daha uyguluyor. Kayıt
süzgeçten geçmezse `foods.js` hiç yazılmıyor.

USDA'da her kalem ayrı bir istek; tur başına 25 kalem işleniyor ve nerede
kalındığı KV'de tutuluyor. Liste bitince başa dönüyor, yani değerler
periyodik olarak tazeleniyor.

### Supplement ajanı

Taradığı siteler koda gömülü; bu listede olmayan hiçbir adrese istek
atılmıyor:

```
hardline.com.tr      proteinocean.com     bigjoy.com.tr
takehiq.com          liventis.com.tr      supplementler.com
```

Keşif `sitemap.xml` üzerinden yapılıyor — kategori sayfalarını gezmek yerine,
çünkü sitemap tam bu iş için var ve siteyi yormuyor. `robots.txt` her tarama
öncesi okunuyor; bir kez bakıp geçmek yetmez, site şartını yarın
değiştirebilir. `Crawl-delay` varsa ona uyuluyor, yoksa istekler arası 1,2
saniye bekleniyor.

Tur başına site başına en fazla 40 ürün okunuyor. Görülen adresler KV'de
tutuluyor, her gece kalanlardan devam ediyor.

**Bu ajanın çıktısı her koşulda "şüpheli" işaretli geliyor** ve bunun somut bir
sebebi var: besin tablosu okuma mantığı gerçek sayfalara karşı ayarlanamadı,
çünkü yazıldığı ortamdan o sitelere ağ çıkışı yoktu. Mantık yaygın kalıplara
dayanıyor (JSON-LD ürün bilgisi + HTML besin tablosu) ve temsili HTML'lerle
sınandı. İlk gerçek turda her siteyi tek tek doğrulaman, gerekirse siteye özel
adaptör yazmamız gerekiyor. Panelde değerleri ürün sayfasıyla karşılaştırmadan
onaylama.

Okuma mantığının yakaladığı tuzaklar: "doymuş yağ" satırı toplam yağ
sanılmıyor, `1.240` binlik ayraçla `1,240` ondalıkla karıştırılmıyor, kJ
değerleri kcal'e çevriliyor, ve değerlerin hangi tabana ait olduğu (100 g mı
porsiyon mu) sütun başlığından okunuyor — bunu bilmeden makro denetimi her
ürünü hatalı işaretliyordu.

### Analiz ajanı için ek kurulum

```bash
wrangler secret put GEMINI_API_KEY
```

Uygulamada zaten kullandığın Gemini anahtarının aynısı olabilir.

Bu ajan cron'la çalışmıyor: uygulamadaki **Analiz Et** düğmesi tetikliyor.
Sebebi veri: antrenman geçmişi telefonda (`localStorage`) duruyor, Worker'da
değil. Düğmeye basınca uygulama geçmişi Worker'a yolluyor, Worker özetleyip
modele veriyor, yorumu geri gönderiyor. **Worker geçmişi saklamıyor.**

Bir iş bölümü var ve kasıtlı: **sayıları kod hesaplıyor, model yalnız
yorumluyor.** Modele "haftalık hacmimi hesapla" dersen makul görünen ama yanlış
sayılar üretir ve gözle ayırt edemezsin. Haftalık tonaj, kas grubu dağılımı ve
durgunluk tespiti Worker'da hesaplanıyor; modelin işi "şu kas 3 haftadır ihmal
edilmiş" demek.

Analiz sonucu onay beklemiyor — analiz veri değil **rapor**, kullanıcının kendi
antrenmanı hakkında kendisi için üretiliyor. Panelde yine de bir kayıt
bırakıyor: eski değerlendirmelere bakılabilsin diye.

### Egzersiz ajanı neden "eşleştirme" yapıyor?

Uygulamadaki 281 hareket zaten bu veri setinden derlenmiş ama sadeleştirilmiş
adlarla. Kaynakta `Barbell Bench Press` diye bir kayıt **yok** — yalnızca
`Barbell Bench Press - Medium Grip` var. 21 çeşit bench press kaydı arasından
doğrusunu bulmak gerekiyor.

### Talimatlar nasıl Türkçeleşiyor

Kaynaktaki talimatlar İngilizce. Ajan bunları Gemini ile çeviriyor ve sonucu
KV'de tek bir blob'da önbelliyor (`ceviri:egzersiz`). Önbellek anahtarı hareket
adı değil, İngilizce metnin kendisi — kaynak metin değişirse çeviri de
kendiliğinden yenileniyor.

İlk turda 876 hareketin tamamı çevrilmemiş oluyor; bu 73 model çağrısı demek ve
Worker'ın süre sınırını zorluyor. O yüzden tur başına en fazla 20 yığın
çevriliyor, önbellek birkaç gecede doluyor. Bu arada çevrilmemiş kayıtlar
İngilizce talimatla geliyor ve açıklamalarında öyle yazıyor.

Model beş adımlık bir talimata üç adım dönerse çeviri **kabul edilmiyor** —
eksik anlatımı fark etmek zor. O kayıt bir sonraki turda yeniden deneniyor.
`GEMINI_API_KEY` yoksa çeviri hiç denenmiyor, talimatlar İngilizce geliyor.

### Eşleştirme neden muhafazakâr

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

---

# Uygulama tarafı

Ajanların getirdiği veri uygulamada şu iki yerde kullanılıyor.

## Kas haritası

Hareket kartındaki anatomi panelinde birincil ve ikincil kaslar **farklı
renkte** boyanıyor: bench press yapınca sadece göğüs çalışmıyor, omuz ve
triceps de çalışıyor — tek renkli harita bunu gizliyordu.

Turuncu/mavi çifti seçildi çünkü renk körlüğünde de ayrılıyor; aynı rengin
koyu/açık tonu ayrılmıyor.

Figürün altında kalıcı bir liste var (hangi kaslar, hangi rolde) ve boyalı bir
kasa dokununca üstünde konuşma balonu açılıyor. Bilgisayarda imleç üstüne
gelince de çıkıyor.

İkincil kas verisi `EXERCISE_INFO`'dan geliyor ve ajan onayıyla doluyor. Veri
gelmeden önce panel eskisi gibi tek kas gösteriyor — özellik veri beklemeden de
çalışıyor.

## Ekipman filtresi

Antrenman planı oluştururken bölge seçiminin altında ekipman süzgeci var. Ajan
hareket listesini 281'den binlere çıkarabiliyor; "Göğüs" seçince 18 çeşit bench
press arasından seçmek zorlaşıyor.

Seçenekler o bölgede gerçekten var olan ekipmanlardan üretiliyor ve yanlarında
kaç hareket olduğu yazıyor. Bölge değiştiğinde seçim hâlâ geçerliyse
korunuyor — dumbbell'la çalışan biri her bölgede baştan seçmesin.

"Hepsi" seçiliyken listenin filtresiz hâliyle birebir aynı olduğu testle
tutuluyor: süzgeç hiçbir hareketi kaybetmemeli.
