/* Gıda kayıtları için doğrulama süzgeci.
   Veri toplamanın zor kısmı toplamak değil, gelenin doğru olduğunu bilmek.
   Bir dil modeli ya da yanlış eşleşmiş bir arama sonucu makul görünen ama
   yanlış sayılar üretir; gözle ayırt edilemez. Buradaki kontroller
   sayıların kendi içinde tutarlı olup olmadığına bakıyor. */

/* Makro-kalori tutarlılığı: kcal ≈ protein×4 + karbonhidrat×4 + yağ×9.

   Eşik iki yönde farklı, çünkü sapmanın iki yönü aynı şey değil:

   Hesap YAZILANDAN YÜKSEKSE masum bir açıklaması var — lif. Lif karbonhidrata
   sayılır ama kalori vermez, o yüzden kural lifli gıdalarda fazla hesaplar.
   Sebzelerde ve salçada tam olarak bu oluyor. Burada gevşek davranıyoruz.

   Hesap YAZILANDAN DÜŞÜKSE böyle bir açıklama yok: kimse kaloriyi lif yüzünden
   fazla yazmaz. Uydurulmuş ya da yanlış eşleşmiş kayıtlar bu yöne sapar.
   Burada sıkı davranıyoruz.

   Bu ayrım deneyerek çıktı: tek yönlü %15'lik eşikte 48 gıdanın 9'u (hepsi
   sebze) ve domates salçası yanlışlıkla eleniyordu; hepsi doğruydu. */
export const LIF_YONU = { oran: 0.28, mutlak: 20 };   // hesap > yazan
export const SUPHE_YONU = { oran: 0.10, mutlak: 10 }; // yazan > hesap

export function makroTutarli(g) {
  const hesap = g.protein * 4 + g.carbs * 4 + g.fat * 9;
  if (g.kcal === 0) return { tutarli: hesap < 5, hesap: Math.round(hesap), yon: 'sifir' };

  const fark = hesap - g.kcal;
  const oran = Math.abs(fark) / g.kcal;
  const mutlak = Math.abs(fark);
  const esik = fark > 0 ? LIF_YONU : SUPHE_YONU;

  return {
    tutarli: !(oran > esik.oran && mutlak > esik.mutlak),
    hesap: Math.round(hesap),
    yon: fark > 0 ? 'hesap-yuksek' : 'yazan-yuksek',
    oran, mutlak
  };
}

/* Fiziksel sınırlar. 100 gramda 100 gramdan fazla makro olamaz; en yağlı
   gıda bile 900 kcal'i geçmez (saf yağ 884). */
const ARALIK = {
  kcal:    [0, 900],
  protein: [0, 100],
  carbs:   [0, 100],
  fat:     [0, 100]
};

export function gidaDogrula(g) {
  const hatalar = [];

  if (!g || typeof g.name !== 'string' || !g.name.trim()) {
    return ['Ad boş ya da metin değil'];
  }
  for (const alan of ['kcal', 'protein', 'carbs', 'fat']) {
    const d = g[alan];
    if (typeof d !== 'number' || !isFinite(d)) { hatalar.push(alan + ' sayı değil: ' + d); continue; }
    const [alt, ust] = ARALIK[alan];
    if (d < alt || d > ust) hatalar.push(alan + ' aralık dışı: ' + d + ' (' + alt + '-' + ust + ')');
  }
  if (hatalar.length) return hatalar;

  // Makroların toplamı 100 gramı aşamaz (su ve lif payı için biraz tolerans)
  const makroToplam = g.protein + g.carbs + g.fat;
  if (makroToplam > 105) hatalar.push('Makro toplamı 100 g\'ı aşıyor: ' + makroToplam.toFixed(1));

  const m = makroTutarli(g);
  if (!m.tutarli) {
    hatalar.push('Kalori makrolarla tutmuyor: yazan ' + g.kcal + ', makrolardan ' + m.hesap +
                 ' (%' + Math.round(m.oran * 100) + ')');
  }
  return hatalar;
}

/* Bütün listeyi denetler; tekrar eden adları da yakalar. */
export function listeDogrula(kategoriler) {
  const sorunlar = [];
  const gorulen = new Map();

  for (const kat of kategoriler) {
    for (const g of kat.gidalar) {
      const anahtar = g.name.trim().toLowerCase();
      if (gorulen.has(anahtar)) {
        sorunlar.push({ ad: g.name, kategori: kat.ad, hatalar: ['Tekrar eden ad (' + gorulen.get(anahtar) + ' içinde de var)'] });
      } else {
        gorulen.set(anahtar, kat.ad);
      }
      const hatalar = gidaDogrula(g);
      if (hatalar.length) sorunlar.push({ ad: g.name, kategori: kat.ad, hatalar });
    }
  }
  return sorunlar;
}
