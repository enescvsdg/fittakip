/* Gıda veritabanı ve onu üreten süzgeç.
   Veri toplamanın zor kısmı toplamak değil, gelenin doğru olduğunu bilmek.
   Uydurulmuş bir besin değeri makul görünür ve gözle ayırt edilemez; kalori
   hesabını sessizce bozar. Bu takım hem süzgeci hem de üretilmiş veriyi sınıyor. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gidaDogrula, listeDogrula, makroTutarli } from '../../tools/gida-dogrula.mjs';
import { tariftenHesapla, tarifDogrula } from '../../tools/gida-hesapla.mjs';

const KOK = fileURLToPath(new URL('../../', import.meta.url));

export default async function ({ rapor }) {
  rapor.baslik('süzgeç — uydurma değerleri yakalıyor');
  const saglam = { name: 'Test', kcal: 100, protein: 10, carbs: 10, fat: 2 };
  rapor.kontrol('Tutarlı kayıt geçiyor', gidaDogrula(saglam).length === 0,
    gidaDogrula(saglam).join('; '));
  rapor.kontrol('Uydurma kalori yakalanıyor',
    gidaDogrula({ ...saglam, kcal: 400 }).length > 0);
  /* Gerçek birim karışıklığı: makrolar 100 gram için ama kalori bir porsiyon
     için yazılmış. Çorbanın 100 gramı 53 kcal, porsiyonu 250 — aradaki uçurum
     süzgece takılıyor. (İlk denememde kendi içinde tutarlı bir örnek seçmiştim,
     o zaten yakalanacak bir hata değil.) */
  rapor.kontrol('Porsiyon/100g karışıklığı yakalanıyor',
    gidaDogrula({ name: 'x', kcal: 250, protein: 3, carbs: 8, fat: 1 }).length > 0,
    JSON.stringify(gidaDogrula({ name: 'x', kcal: 250, protein: 3, carbs: 8, fat: 1 })));
  rapor.kontrol('İmkânsız kalori yakalanıyor',
    gidaDogrula({ ...saglam, kcal: 5000 }).length > 0);
  rapor.kontrol('Negatif değer yakalanıyor',
    gidaDogrula({ ...saglam, protein: -5 }).length > 0);
  rapor.kontrol('Makro toplamı 100 gramı aşamaz',
    gidaDogrula({ name: 'x', kcal: 800, protein: 60, carbs: 60, fat: 30 }).length > 0);
  rapor.kontrol('Adsız kayıt yakalanıyor', gidaDogrula({ name: '  ', kcal: 1 }).length > 0);

  rapor.baslik('süzgeç — lif yüzünden sapanı elemiyor');
  /* Lif karbonhidrata sayılır ama kalori vermez: hesap yazılandan YÜKSEK çıkar.
     Bu masum. Tersi (yazılan hesaptan yüksek) masum değil — öyle sapan kayıtlar
     uydurulmuş oluyor. Süzgeç iki yöne farklı eşik uyguluyor. */
  const lifli = [
    { name: 'Marul', kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
    { name: 'Ispanak', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    { name: 'Domates Salçası', kcal: 82, protein: 4.3, carbs: 18.9, fat: 0.5 }
  ];
  lifli.forEach(g => rapor.kontrol(g.name + ' elenmiyor', gidaDogrula(g).length === 0,
    gidaDogrula(g).join('; ')));
  rapor.kontrol('Lifli sapmanın yönü doğru okunuyor',
    makroTutarli(lifli[2]).yon === 'hesap-yuksek', makroTutarli(lifli[2]).yon);
  // Aynı sapma ters yönde olsaydı elenmeliydi
  rapor.kontrol('Ters yöndeki aynı sapma eleniyor',
    gidaDogrula({ name: 'x', kcal: 97, protein: 4.3, carbs: 13.2, fat: 0.5 }).length > 0);

  rapor.baslik('tarif hesabı');
  const db = {
    'Kırmızı Mercimek (çiğ)': { kcal: 358, protein: 24, carbs: 63, fat: 1.1 },
    'Soğan': { kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
    'Su': { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  };
  const bul = ad => db[ad];
  const corba = { ad: 'Çorba', malzemeler: [
    { gida: 'Kırmızı Mercimek (çiğ)', gram: 100 }, { gida: 'Su', gram: 900 }], pisenAgirlik: 1000 };
  const c = tariftenHesapla(corba, bul);
  // 100 g mercimek 1000 g çorbaya dağılıyor → onda biri
  rapor.kontrol('Su ile seyrelme doğru hesaplanıyor', c.kcal === 36, String(c.kcal));
  rapor.kontrol('Protein de seyreliyor', c.protein === 2.4, String(c.protein));
  rapor.kontrol('Kaynak tarif olarak işaretleniyor', c.kaynak === 'tarif');
  rapor.kontrol('Tarif metni kaydediliyor', c.tarif.indexOf('Kırmızı Mercimek') !== -1, c.tarif);

  rapor.kontrol('Bilinmeyen malzeme hata veriyor',
    !!tariftenHesapla({ ad: 'x', malzemeler: [{ gida: 'Ejderha Eti', gram: 100 }] }, bul).hata);

  rapor.baslik('tarif denetimi');
  rapor.kontrol('Sağlam tarif geçiyor', tarifDogrula(corba).length === 0);
  rapor.kontrol('Malzemesiz tarif eleniyor', tarifDogrula({ ad: 'x', malzemeler: [] }).length > 0);
  rapor.kontrol('Geçersiz gram eleniyor',
    tarifDogrula({ ad: 'x', malzemeler: [{ gida: 'a', gram: 0 }] }).length > 0);
  rapor.kontrol('Ham ağırlıktan fazla pişmiş ağırlık eleniyor',
    tarifDogrula({ ad: 'x', malzemeler: [{ gida: 'a', gram: 100 }], pisenAgirlik: 500 }).length > 0);
  rapor.kontrol('Aşırı düşük pişmiş ağırlık eleniyor',
    tarifDogrula({ ad: 'x', malzemeler: [{ gida: 'a', gram: 1000 }], pisenAgirlik: 100 }).length > 0);

  rapor.baslik('üretilmiş veritabanı');
  const kaynak = await readFile(KOK + 'foods.js', 'utf8');
  const kategoriler = [];
  let kat = null;
  for (const satir of kaynak.split('\n')) {
    const k = satir.match(/^  '([^']+)': \[/);
    if (k) { kat = { ad: k[1], gidalar: [] }; kategoriler.push(kat); }
    const g = satir.match(/name: '([^']+)', kcal: ([\d.]+), protein: ([\d.]+), carbs: ([\d.]+), fat: ([\d.]+)/);
    if (g && kat) kat.gidalar.push({ name: g[1], kcal: +g[2], protein: +g[3], carbs: +g[4], fat: +g[5] });
  }
  const toplam = kategoriler.reduce((t, k) => t + k.gidalar.length, 0);
  rapor.kontrol('Veritabanı okunabiliyor', toplam > 100, toplam + ' gıda');

  const sorunlar = listeDogrula(kategoriler);
  rapor.kontrol('Yayınlanan veritabanında sorunlu kayıt yok', sorunlar.length === 0,
    sorunlar.slice(0, 3).map(s => s.ad + ': ' + s.hatalar[0]).join(' | '));

  rapor.kontrol('Her kaydın kaynağı yazılı',
    (kaynak.match(/kaynak: '/g) || []).length === toplam,
    (kaynak.match(/kaynak: '/g) || []).length + ' / ' + toplam);

  const yemekler = kategoriler.find(k => k.ad === 'Yemekler');
  rapor.kontrol('Yemekler kategorisi var', !!yemekler && yemekler.gidalar.length >= 20,
    yemekler ? String(yemekler.gidalar.length) : '(yok)');
  rapor.kontrol('Yemeklerin tarifi kaydedilmiş',
    (kaynak.match(/tarif: '/g) || []).length === (yemekler ? yemekler.gidalar.length : -1));

  // ── ÜRETİLEN DOSYA GÜVENLİĞİ ───────────────────
  /* Gıda adları artık ajanlardan geliyor: Open Food Facts katkıcı girdisi ve
     marka ürün sayfaları. Yalnız tırnağı kaçırmak yetmiyor — sonunda ters
     bölü olan ya da satır sonu içeren tek bir ad, üretilen foods.js'i
     çalıştırılamaz hale getirip "veri-al"ın tamamını durduruyordu. */
  rapor.baslik('düşmanca gıda adları dosyayı bozmuyor');
  const { metinSabiti } = await import('../../tools/gida-topla.mjs');

  const zorluAdlar = [
    ['ters bölü sonu', 'Bisküvi\\'],
    ['satır sonu', 'Ürün\nadı'],
    ['tırnak', "Çoban'ın Salatası"],
    ['kod denemesi', "x\\', kcal: 0, zararli: (function(){ globalThis.GIDA_SIZDI = 1; return 0; })(), q: '"],
    ['satır ayırıcı', 'Tuhaf\u2028Ad'],
    ['karışık', "a\\'b\nc\\"]
  ];

  for (const [etiket, ad] of zorluAdlar) {
    const satir = 'var K = { name: ' + metinSabiti(ad) + ', kcal: 100 };';
    let geri = null, hata = null;
    try { geri = new Function(satir + ' return K;')(); }
    catch (e) { hata = e.message; }
    rapor.kontrol(etiket + ' — dosya çalıştırılabiliyor', hata === null, String(hata).slice(0, 45));
    rapor.kontrol(etiket + ' — ad bozulmadan geri geliyor',
      geri && geri.name === ad, geri ? JSON.stringify(geri.name).slice(0, 50) : '(çalışmadı)');
  }
  rapor.kontrol('Hiçbir kod çalışmadı', globalThis.GIDA_SIZDI === undefined);
}
