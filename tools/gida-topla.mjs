/* Gıda veritabanını derleyip foods.js'i üretir.
   Uygulama çalışma anında hiçbir veri toplamıyor — bu betik elle çalıştırılıyor,
   çıktısı gözden geçirilip commit ediliyor.

   Kullanım:
     node tools/gida-topla.mjs                 → tarifleri hesapla, foods.js yaz
     node tools/gida-topla.mjs --denetle       → hiçbir şey yazma, sadece denetle
     node tools/gida-topla.mjs --usda ANAHTAR  → temel gıdaları USDA'dan tazele

   Her kaydın "kaynak" alanı nereden geldiğini söyler: elle, tarif ya da usda. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { listeDogrula, gidaDogrula } from './gida-dogrula.mjs';
import { tariftenHesapla, tarifDogrula } from './gida-hesapla.mjs';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const oku = async y => JSON.parse(await readFile(KOK + y, 'utf8'));

const bayrak = ad => process.argv.includes(ad);
const deger = ad => { const i = process.argv.indexOf(ad); return i === -1 ? null : process.argv[i + 1]; };

const YEMEK_KATEGORISI = 'Yemekler';

async function main() {
  const temel = await oku('tools/veri/temel-gidalar.json');
  const tarifler = await oku('tools/veri/yemekler.json');

  // Kategori sırası korunuyor: listede gıdalar bu sırada görünüyor
  const kategoriler = temel.map(k => ({ ad: k.ad, gidalar: k.gidalar.slice() }));
  const bul = ad => {
    const a = ad.trim().toLowerCase();
    for (const k of kategoriler) {
      const g = k.gidalar.find(x => x.name.trim().toLowerCase() === a);
      if (g) return g;
    }
    return null;
  };

  const rapor = { eklenen: 0, elenen: [], uyari: [] };

  // ── Tarifden hesaplanan yemekler ──
  const yemekler = [];
  for (const t of tarifler) {
    const tHata = tarifDogrula(t);
    if (tHata.length) { rapor.elenen.push({ ad: t.ad, sebep: tHata.join('; ') }); continue; }

    const sonuc = tariftenHesapla(t, bul);
    if (sonuc.hata) { rapor.elenen.push({ ad: t.ad, sebep: sonuc.hata }); continue; }

    const hatalar = gidaDogrula(sonuc);
    if (hatalar.length) { rapor.elenen.push({ ad: t.ad, sebep: hatalar.join('; ') }); continue; }

    yemekler.push(sonuc);
    rapor.eklenen++;
  }
  if (yemekler.length) kategoriler.push({ ad: YEMEK_KATEGORISI, gidalar: yemekler });

  // ── Bütün listeyi denetle ──
  const sorunlar = listeDogrula(kategoriler);

  const toplam = kategoriler.reduce((t, k) => t + k.gidalar.length, 0);
  console.log('Kategori: ' + kategoriler.length + '  |  Gıda: ' + toplam);
  console.log('Tarifden hesaplanan: ' + rapor.eklenen + ' / ' + tarifler.length);

  if (rapor.elenen.length) {
    console.log('\nSüzgeçten geçemeyen tarifler:');
    rapor.elenen.forEach(e => console.log('  ✗ ' + e.ad + ' — ' + e.sebep));
  }
  if (sorunlar.length) {
    console.log('\nDenetimde sorunlu kayıtlar:');
    sorunlar.forEach(s => console.log('  ✗ [' + s.kategori + '] ' + s.ad + ' — ' + s.hatalar.join('; ')));
    if (!bayrak('--denetle')) {
      console.error('\nSorunlu kayıt varken dosya yazılmadı. Önce düzelt.');
      process.exit(1);
    }
  } else {
    console.log('\nBütün kayıtlar süzgeçten geçti.');
  }

  if (bayrak('--denetle')) return;
  if (deger('--usda')) {
    console.log('\nUSDA tazeleme bu ortamdan çalışmıyor (ağ kapalı).');
    console.log('Kendi bilgisayarında çalıştır: node tools/gida-topla.mjs --usda ANAHTARIN');
  }

  await writeFile(KOK + 'foods.js', dosyaYaz(kategoriler), 'utf8');
  console.log('\nfoods.js yazıldı: ' + toplam + ' gıda.');
}

function sayi(x) { return Number.isInteger(x) ? String(x) : String(x); }

function kayitYaz(g) {
  const parca = ["name: '" + g.name.replace(/'/g, "\\'") + "'",
                 'kcal: ' + sayi(g.kcal), 'protein: ' + sayi(g.protein),
                 'carbs: ' + sayi(g.carbs), 'fat: ' + sayi(g.fat)];
  if (g.boylar) {
    parca.push('boylar: { S: ' + g.boylar.S + ', M: ' + g.boylar.M + ', L: ' + g.boylar.L + ' }');
  }
  parca.push("kaynak: '" + (g.kaynak || 'elle') + "'");
  if (g.tarif) parca.push("tarif: '" + g.tarif.replace(/'/g, "\\'") + "'");
  return '    { ' + parca.join(', ') + ' }';
}

function dosyaYaz(kategoriler) {
  const bas =
`/* ══════════════════════════════════════════
   GIDA VERİTABANI — tools/gida-topla.mjs tarafından üretiliyor
   Elle düzenleme: tools/veri/ altındaki kaynak dosyaları değiştir,
   sonra "node tools/gida-topla.mjs" çalıştır.

   Bütün değerler 100 gram içindir.
   kaynak alanı verinin nereden geldiğini söyler:
     elle  — genel beslenme kaynaklarından girilmiş
     tarif — malzemelerinden hesaplanmış (tarif alanında yazıyor)
     usda  — USDA FoodData Central'dan çekilmiş
   ══════════════════════════════════════════ */

var TURKISH_FOODS = {
`;
  const govde = kategoriler.map(k =>
    "  '" + k.ad + "': [\n" + k.gidalar.map(kayitYaz).join(',\n') + '\n  ]'
  ).join(',\n');
  return bas + govde + '\n};\n';
}

main().catch(e => { console.error(e); process.exit(1); });
