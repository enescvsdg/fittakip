/* ══════════════════════════════════════════
   Onaylanan gıda kayıtlarını kaynak dosyaya işler.

   foods.js elle düzenlenmiyor: tools/veri/temel-gidalar.json'dan üretiliyor.
   Bu yüzden birleştirme de oraya yapılıyor, sonra gida-topla.mjs foods.js'i
   yeniden üretiyor ve doğrulama kapısı devreye giriyor.
   ══════════════════════════════════════════ */

const SAYISAL = ['kcal', 'protein', 'carbs', 'fat'];

export function birlestir(kategoriler, kayitlar) {
  const kopya = kategoriler.map(k => ({ ad: k.ad, gidalar: k.gidalar.slice() }));
  const kategoriBul = ad => kopya.find(k => k.ad === ad);
  const yerBul = name => {
    for (const k of kopya) {
      const i = k.gidalar.findIndex(g => g.name === name);
      if (i >= 0) return { kategori: k, sira: i };
    }
    return null;
  };

  const rapor = { guncellenen: 0, eklenen: 0, atlanan: 0, atlananlar: [] };

  for (const kayit of kayitlar) {
    const v = kayit.veri || {};
    if (!v.name || SAYISAL.some(a => typeof v[a] !== 'number')) {
      rapor.atlanan++;
      rapor.atlananlar.push((v.name || kayit.ad) + ' (besin değerleri eksik)');
      continue;
    }

    const yeni = {
      name: v.name,
      kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat,
      kaynak: v.kaynak === 'openfoodfacts' ? 'off' : (v.kaynak || 'usda')
    };
    if (v.mikro && Object.keys(v.mikro).length) yeni.mikro = { ...v.mikro };

    const mevcut = yerBul(v.name);
    if (mevcut) {
      /* Elle girilmiş bir kaydın üzerine yazıyoruz ama boylar/tarif gibi
         kendi alanlarını koruyoruz — onlar USDA'dan gelmiyor. */
      const eski = mevcut.kategori.gidalar[mevcut.sira];
      mevcut.kategori.gidalar[mevcut.sira] = {
        ...(eski.boylar ? { boylar: eski.boylar } : {}),
        ...(eski.tarif ? { tarif: eski.tarif } : {}),
        ...yeni
      };
      rapor.guncellenen++;
      continue;
    }

    const kategoriAdi = v.kategori || 'Paketli Ürünler';
    let kategori = kategoriBul(kategoriAdi);
    if (!kategori) {
      kategori = { ad: kategoriAdi, gidalar: [] };
      kopya.push(kategori);
    }
    kategori.gidalar.push(yeni);
    rapor.eklenen++;
  }

  return { kategoriler: kopya, rapor };
}
