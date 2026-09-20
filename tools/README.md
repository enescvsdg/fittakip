# Gıda veri araçları

Uygulama çalışma anında hiçbir veri toplamıyor. Bu betikler **elle** çalıştırılıyor,
çıktıları gözden geçirilip commit ediliyor.

```bash
node tools/gida-topla.mjs              # tarifleri hesapla, foods.js'i yaz
node tools/gida-topla.mjs --denetle    # hiçbir şey yazma, yalnız denetle
```

`--denetle` `npm run check` içinde de koşuyor, yani bozuk bir kayıt fark edilmeden
commit edilemiyor.

## Dosyalar

| Dosya | İşi |
|---|---|
| `veri/temel-gidalar.json` | Elle girilmiş temel gıdalar (100 g için) |
| `veri/yemekler.json` | Yemek tarifleri — malzeme ve gram |
| `gida-hesapla.mjs` | Tarifden besin değeri hesabı |
| `gida-dogrula.mjs` | Süzgeç |
| `gida-topla.mjs` | Hepsini birleştirip `foods.js`'i üreten betik |

## Neden tarif

USDA'da "pirinç" var ama "karnıyarık" yok. Klasik çözüm bir dil modeline
"karnıyarık kaç kalori" diye sormaktır — model uydurur ve uydurduğu doğrulanamaz.
Onun yerine yemek malzemelerine ayrılıp elimizdeki ölçülmüş değerlerle toplanıyor:
modelin işi tarif oranını bilmek, kalori matematiği bizde kalıyor. Tarif uygulamada
da gösteriliyor, kullanıcı bakıp itiraz edebiliyor.

Pişmiş ağırlık ayrı bildiriliyor: çorbaya su ekleniyor, kızartmada su uçuyor.

## Süzgeç neye bakıyor

`kcal ≈ protein×4 + karbonhidrat×4 + yağ×9` kuralı, ama **iki yönde farklı eşikle**:

- **Hesap yazılandan yüksekse** masum bir açıklaması var: lif. Lif karbonhidrata
  sayılır, kalori vermez. Sebzelerde ve salçada olan bu. Gevşek davranılıyor.
- **Yazılan hesaptan yüksekse** böyle bir açıklama yok. Uydurulmuş ya da yanlış
  eşleşmiş kayıtlar bu yöne sapıyor. Sıkı davranılıyor.

Bu ayrım deneyerek çıktı: tek yönlü %15'lik eşikte mevcut 48 gıdanın 9'u (hepsi
sebze) ve domates salçası yanlışlıkla eleniyordu — hepsi doğruydu.

Ayrıca: fiziksel aralıklar (kcal 0-900, makro 0-100), makro toplamının 100 g'ı
aşmaması, tekrar eden ad.

## USDA ile tazeleme

Temel gıdalar USDA FoodData Central'dan tazelenebilir. Ücretsiz anahtar gerekiyor
(`DEMO_KEY` saatte 30 istekle sınırlı, yetmez):
https://fdc.nal.usda.gov/api-key-signup.html

```bash
node tools/gida-topla.mjs --usda ANAHTARIN
```
