/* Günlük kalori ve makro hedefi.
   Bu hesap bilerek kodda; yapay zekâya bırakılsa her çalıştırmada başka sayı
   çıkar ve doğrulanamaz. Burada bilinen referans değerlerle karşılaştırılıyor. */
import { appFonksiyonlari } from '../harness.mjs';

export default async function ({ rapor }) {
  // Tablolar da sökülüyor: fonksiyonlar onlara dışarıdan erişiyor
  const { bazalMetabolizma, aktiviteKatsayisi, gunlukHedef } = await appFonksiyonlari(
    'HAREKET_KATSAYISI', 'HEDEF_ORANI',
    'bazalMetabolizma', 'aktiviteKatsayisi', 'gunlukHedef');

  rapor.baslik('bazal metabolizma (Mifflin-St Jeor)');
  // Elle hesap: 10×80 + 6.25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
  rapor.kontrol('Erkek 80kg/180cm/30y → 1780',
    Math.round(bazalMetabolizma('erkek', 80, 180, 30)) === 1780,
    String(Math.round(bazalMetabolizma('erkek', 80, 180, 30))));
  // 10×60 + 6.25×165 − 5×30 − 161 = 600 + 1031.25 − 150 − 161 = 1320.25
  rapor.kontrol('Kadın 60kg/165cm/30y → 1320',
    Math.round(bazalMetabolizma('kadin', 60, 165, 30)) === 1320,
    String(Math.round(bazalMetabolizma('kadin', 60, 165, 30))));
  rapor.kontrol('Cinsiyet boşsa ikisinin ortasında',
    bazalMetabolizma('', 80, 180, 30) < bazalMetabolizma('erkek', 80, 180, 30) &&
    bazalMetabolizma('', 80, 180, 30) > bazalMetabolizma('kadin', 80, 180, 30));

  rapor.baslik('aktivite katsayısı');
  rapor.kontrol('Masa başı, antrenmansız → 1.25', aktiviteKatsayisi('masa', 0) === 1.25);
  rapor.kontrol('Masa başı, haftada 4 gün → 1.39',
    Math.abs(aktiviteKatsayisi('masa', 4) - 1.39) < 0.001, String(aktiviteKatsayisi('masa', 4)));
  rapor.kontrol('Fiziksel iş masa başından yüksek',
    aktiviteKatsayisi('fiziksel', 3) > aktiviteKatsayisi('masa', 3));
  rapor.kontrol('Bilinmeyen değer masa başı sayılıyor',
    aktiviteKatsayisi('zırva', 0) === aktiviteKatsayisi('masa', 0));
  rapor.kontrol('7 günden fazlası kırpılıyor',
    aktiviteKatsayisi('masa', 40) === aktiviteKatsayisi('masa', 7));

  rapor.baslik('günlük hedef');
  const temel = { kilo: 80, boy: 180, yas: 30, cinsiyet: 'erkek',
                  gunlukHareket: 'masa', haftalikAntrenman: 4 };

  rapor.kontrol('Eksik veride null dönüyor', gunlukHedef({ kilo: 80 }) === null);

  const sabit = gunlukHedef({ ...temel, hedefTipi: 'Sabit Kalmak' });
  // 1780 × 1.39 = 2474
  rapor.kontrol('Sabit kalmakta kalori TDEE ile aynı',
    sabit.kalori === sabit.tdee, sabit.kalori + ' / ' + sabit.tdee);
  rapor.kontrol('TDEE 2474', sabit.tdee === 2474, String(sabit.tdee));

  const ver = gunlukHedef({ ...temel, hedefTipi: 'Kilo Vermek' });
  const al  = gunlukHedef({ ...temel, hedefTipi: 'Kilo Almak' });
  rapor.kontrol('Kilo vermede kalori TDEE altında', ver.kalori < ver.tdee,
    ver.kalori + ' < ' + ver.tdee);
  rapor.kontrol('Kilo almada kalori TDEE üstünde', al.kalori > al.tdee,
    al.kalori + ' > ' + al.tdee);
  rapor.kontrol('Açık %20', Math.round(ver.tdee * 0.8) === ver.kalori,
    ver.kalori + ' beklenen ' + Math.round(ver.tdee * 0.8));

  rapor.baslik('makro dağılımı');
  rapor.kontrol('Kilo verirken protein 2.0 g/kg', ver.protein === 160, String(ver.protein));
  rapor.kontrol('Diğer hedeflerde 1.8 g/kg', sabit.protein === 144, String(sabit.protein));
  const toplam = sabit.protein * 4 + sabit.yag * 9 + sabit.karbonhidrat * 4;
  rapor.kontrol('Makrolar kaloriyi tutuyor (±%2)',
    Math.abs(toplam - sabit.kalori) / sabit.kalori < 0.02,
    toplam + ' / ' + sabit.kalori);
  rapor.kontrol('Yağ kalorinin ~%25i',
    Math.abs((sabit.yag * 9) / sabit.kalori - 0.25) < 0.01,
    ((sabit.yag * 9) / sabit.kalori).toFixed(3));

  rapor.baslik('bazalın altına inmiyor');
  /* Geniş bir tarama: hiçbir girdi bileşiminde günlük hedef bazal metabolizmanın
     altına düşmemeli. Şu anki katsayılarla en uç durum (masa başı, antrenmansız,
     kilo verme) tam bazala oturuyor — 1.25 × 0.80 = 1.00. Yani taban şu an
     aşılmıyor, sadece değiyor. Koruma ileride katsayılar değişirse diye duruyor,
     bu yüzden test uyarıyı "çıkmalı" diye değil, "çıktıysa gerçekten yükseltilmiş
     olmalı" diye sınıyor. */
  let enDusukPay = Infinity, uyariliOrnek = null, kirilan = null;
  for (const kilo of [45, 60, 80, 120]) {
    for (const boy of [150, 165, 180, 195]) {
      for (const yas of [18, 30, 45, 70]) {
        for (const cinsiyet of ['erkek', 'kadin', '']) {
          for (const hareket of ['masa', 'ayakta', 'fiziksel']) {
            for (const gun of [0, 3, 6]) {
              for (const hedefTipi of ['Kilo Vermek', 'Sabit Kalmak', 'Kilo Almak']) {
                const h = gunlukHedef({ kilo, boy, yas, cinsiyet,
                  gunlukHareket: hareket, haftalikAntrenman: gun, hedefTipi });
                enDusukPay = Math.min(enDusukPay, h.kalori - h.bmr);
                if (h.kalori < h.bmr) kirilan = { kilo, boy, yas, cinsiyet, hedefTipi };
                if (h.uyari && h.kalori !== h.bmr) uyariliOrnek = h;
              }
            }
          }
        }
      }
    }
  }
  rapor.kontrol('Hiçbir bileşimde bazalın altına inmiyor', kirilan === null,
    kirilan ? JSON.stringify(kirilan) : 'en düşük pay ' + enDusukPay + ' kcal');
  rapor.kontrol('Uyarı yalnız gerçekten yükseltildiğinde çıkıyor', uyariliOrnek === null,
    uyariliOrnek ? JSON.stringify(uyariliOrnek) : 'tutarlı');
  rapor.kontrol('Normal durumda uyarı yok', sabit.uyari === '', sabit.uyari || '(yok)');
}
