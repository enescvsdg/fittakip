# FitTakip PWA

Kişisel fitness, beslenme ve supplement takip uygulaması.

## GitHub Pages'e Yükleme (Adım Adım)

### 1. GitHub Hesabı Aç
- https://github.com adresine git
- Hesabın yoksa "Sign up" ile ücretsiz hesap oluştur

### 2. Yeni Repo Oluştur
- Sağ üstte "+" simgesine tıkla → "New repository"
- Repository name: `fittakip` (küçük harf, boşluksuz)
- "Public" seçili olsun
- "Create repository" butonuna tıkla

### 3. Dosyaları Yükle
- Açılan sayfada "uploading an existing file" linkine tıkla
- Bu klasördeki TÜM dosyaları sürükle-bırak:
  - index.html
  - style.css
  - app.js
  - sw.js
  - manifest.json
  - icons/ klasörünü de yükle (icon-192.png ve icon-512.png)
- "Commit changes" butonuna tıkla

### 4. GitHub Pages'i Aktif Et
- Repo sayfasında üstteki "Settings" sekmesine tıkla
- Sol menüden "Pages" seçeneğine tıkla
- "Branch" bölümünde "main" seç, "/" (root) bırak
- "Save" tıkla

### 5. Uygulamana Eriş
Birkaç dakika sonra:
`https://KULLANICIADIN.github.io/fittakip/`

## Özellikler
- ✅ Tamamen çevrimdışı çalışır (PWA)
- ✅ iPhone/Android ana ekrana eklenebilir
- ✅ Veriler telefonda saklanır (localStorage)
- ✅ BMI hesaplama
- ✅ Karanlık tema
