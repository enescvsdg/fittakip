/* Yemekleri tarifinden hesaplar.
   USDA'da "pirinç" var ama "karnıyarık" yok. Buradaki klasik çözüm bir dil
   modeline "karnıyarık kaç kalori" diye sormaktır; model uydurur ve uydurduğu
   doğrulanamaz. Bunun yerine yemeği malzemelerine ayırıp elimizdeki ölçülmüş
   değerlerle topluyoruz: modelin işi tarif oranını bilmek, kalori matematiği
   bizde kalıyor. Çıkan tarif ekranda da gösterilebilir, denetlenebilir. */

/* Pişmiş ağırlık, çiğ malzemelerin toplamına eşit değil: çorbaya su eklenir,
   kızartmada su uçar. Her tarif kendi pişmiş ağırlığını bildiriyor. */
export function tariftenHesapla(tarif, gidaBul) {
  const eksik = [];
  let kcal = 0, protein = 0, carbs = 0, fat = 0, hamAgirlik = 0;

  for (const m of tarif.malzemeler) {
    const g = gidaBul(m.gida);
    if (!g) { eksik.push(m.gida); continue; }
    const kat = m.gram / 100;
    kcal += g.kcal * kat;
    protein += g.protein * kat;
    carbs += g.carbs * kat;
    fat += g.fat * kat;
    hamAgirlik += m.gram;
  }

  if (eksik.length) return { hata: 'Malzeme veritabanında yok: ' + eksik.join(', ') };

  const pisen = tarif.pisenAgirlik || hamAgirlik;
  if (!pisen) return { hata: 'Pişmiş ağırlık sıfır' };
  const yuz = 100 / pisen;

  const yuvarla = x => Math.round(x * 10) / 10;
  return {
    name: tarif.ad,
    kcal: Math.round(kcal * yuz),
    protein: yuvarla(protein * yuz),
    carbs: yuvarla(carbs * yuz),
    fat: yuvarla(fat * yuz),
    kaynak: 'tarif',
    tarif: tarif.malzemeler.map(m => m.gida + ' ' + m.gram + 'g').join(', ')
  };
}

/* Tarifin kendisi makul mü — hesaplamadan önceki kontrol. */
export function tarifDogrula(tarif) {
  const hatalar = [];
  if (!tarif.ad) hatalar.push('Ad yok');
  if (!Array.isArray(tarif.malzemeler) || !tarif.malzemeler.length) hatalar.push('Malzeme yok');
  else {
    for (const m of tarif.malzemeler) {
      if (!m.gida) hatalar.push('Malzeme adı yok');
      if (typeof m.gram !== 'number' || m.gram <= 0) hatalar.push(m.gida + ': gram geçersiz (' + m.gram + ')');
    }
  }
  const ham = (tarif.malzemeler || []).reduce((t, m) => t + (m.gram || 0), 0);
  const pisen = tarif.pisenAgirlik;
  if (pisen !== undefined) {
    if (typeof pisen !== 'number' || pisen <= 0) hatalar.push('Pişmiş ağırlık geçersiz');
    // Pişirmede ağırlık en fazla yarıya düşer, en fazla iki katına çıkar
    else if (pisen < ham * 0.45) hatalar.push('Pişmiş ağırlık fazla düşük: ' + pisen + ' / ham ' + ham);
    else if (pisen > ham * 1.05) hatalar.push('Pişmiş ağırlık ham ağırlıktan fazla: ' + pisen + ' / ' + ham);
  }
  return hatalar;
}
