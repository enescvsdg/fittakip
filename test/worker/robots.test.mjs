/* robots.txt uyumu.

   Ajan bir siteye girmeden önce kurallarına bakıyor. Bu bir nezaket değil,
   pratik bir zorunluluk: uymayan istemciler engelleniyor ve ajan tamamen
   çalışmaz hale geliyor. Kural yorumu yanlış olursa ya yasaklı yere gireriz
   ya da izinli yeri hiç taramayız. */
import { kurallariCoz, yolaIzinVar, kurallariGetir, AJAN_ADI } from '../../worker/src/robots.js';

const coz = (metin, ajan) => kurallariCoz(metin, ajan);

export default async function ({ rapor }) {
  rapor.baslik('temel kurallar');
  const basit = coz('User-agent: *\nDisallow: /admin\nDisallow: /sepet\n');
  rapor.kontrol('Yasaklı yol kapalı', yolaIzinVar(basit, '/admin') === false);
  rapor.kontrol('Yasaklı yolun altı da kapalı', yolaIzinVar(basit, '/admin/ayarlar') === false);
  rapor.kontrol('Serbest yol açık', yolaIzinVar(basit, '/urun/whey-protein') === true);

  rapor.baslik('kural yoksa serbest');
  rapor.kontrol('Boş dosyada her yol açık', yolaIzinVar(coz(''), '/herhangi') === true);
  rapor.kontrol('Kural nesnesi yoksa açık', yolaIzinVar(null, '/herhangi') === true);
  rapor.kontrol('Boş Disallow kısıt getirmiyor',
    yolaIzinVar(coz('User-agent: *\nDisallow:\n'), '/urun') === true);

  rapor.baslik('Allow, Disallow\'u deliyor');
  const delik = coz('User-agent: *\nDisallow: /urun\nAllow: /urun/whey\n');
  rapor.kontrol('Genel yasak duruyor', yolaIzinVar(delik, '/urun/kreatin') === false);
  rapor.kontrol('İzin verilen alt yol açık', yolaIzinVar(delik, '/urun/whey') === true);
  rapor.kontrol('İzinli yolun altı da açık', yolaIzinVar(delik, '/urun/whey/izole') === true);

  rapor.baslik('en uzun kural kazanıyor');
  const uzun = coz('User-agent: *\nAllow: /a\nDisallow: /a/b\n');
  rapor.kontrol('Daha uzun yasak kazanıyor', yolaIzinVar(uzun, '/a/b/c') === false);
  rapor.kontrol('Kısa izin kendi alanında geçerli', yolaIzinVar(uzun, '/a/x') === true);

  rapor.baslik('joker ve satır sonu');
  const joker = coz('User-agent: *\nDisallow: /*.pdf$\nDisallow: /ara?*\n');
  rapor.kontrol('*.pdf$ kapalı', yolaIzinVar(joker, '/belgeler/katalog.pdf') === false);
  rapor.kontrol('pdf olmayan açık', yolaIzinVar(joker, '/belgeler/katalog.html') === true);
  rapor.kontrol('$ olmadan ortada geçen eşleşmiyor',
    yolaIzinVar(joker, '/katalog.pdf.html') === true);
  rapor.kontrol('Joker ortada çalışıyor', yolaIzinVar(joker, '/ara?q=whey') === false);

  rapor.baslik('bize özel blok yıldızı eziyor');
  const ozel = 'User-agent: *\nDisallow: /\n\nUser-agent: ' + AJAN_ADI + '\nDisallow: /admin\n';
  const bizim = coz(ozel);
  rapor.kontrol('Yıldızdaki tam yasak bizi bağlamıyor',
    yolaIzinVar(bizim, '/urun/whey') === true);
  rapor.kontrol('Bize yazılan yasak geçerli', yolaIzinVar(bizim, '/admin') === false);
  rapor.kontrol('Başka ajan yıldızı görüyor',
    yolaIzinVar(coz(ozel, 'BaskaBot'), '/urun/whey') === false);

  rapor.baslik('üst üste User-agent satırları');
  const ustUste = coz('User-agent: Ajan1\nUser-agent: ' + AJAN_ADI + '\nDisallow: /gizli\n');
  rapor.kontrol('Ortak blok bize de uygulanıyor',
    yolaIzinVar(ustUste, '/gizli') === false);
  rapor.kontrol('Diğer yollar açık', yolaIzinVar(ustUste, '/acik') === true);

  rapor.baslik('yorum ve biçim toleransı');
  const daginik = coz('  # yorum satırı\nUSER-AGENT:  *  \n  Disallow:  /kapali   # neden\n');
  rapor.kontrol('Büyük harf alan adı okunuyor', yolaIzinVar(daginik, '/kapali') === false);
  rapor.kontrol('Yorumlar temizleniyor', yolaIzinVar(daginik, '/acik') === true);
  rapor.kontrol('İki noktasız satır yok sayılıyor',
    yolaIzinVar(coz('User-agent: *\nbozuk satir\nDisallow: /x'), '/x') === false);

  rapor.baslik('crawl-delay okunuyor');
  rapor.kontrol('Sayı alınıyor',
    coz('User-agent: *\nCrawl-delay: 5\n').gecikme === 5);
  rapor.kontrol('Ondalık da alınıyor',
    coz('User-agent: *\nCrawl-delay: 2.5\n').gecikme === 2.5);
  rapor.kontrol('Sayı değilse yok sayılıyor',
    coz('User-agent: *\nCrawl-delay: hemen\n').gecikme === null);

  // ── AĞ DAVRANIŞI ───────────────────────────────
  const cevap = (status, govde = '') => async () => ({
    ok: status >= 200 && status < 300, status,
    text: async () => govde
  });

  rapor.baslik('dosya yoksa tarama serbest');
  const yok = await kurallariGetir('https://ornek.dev', { getir: cevap(404) });
  rapor.kontrol('404 taramayı engellemiyor', yok.taranabilir === true, yok.sebep);
  rapor.kontrol('Kural nesnesi boş', yok.kurallar === null);

  rapor.baslik('sunucu hatasında taranmıyor');
  const bes = await kurallariGetir('https://ornek.dev', { getir: cevap(503) });
  rapor.kontrol('5xx taramayı durduruyor', bes.taranabilir === false, bes.sebep);
  rapor.kontrol('Sebep açıklanıyor', /503/.test(bes.sebep), bes.sebep);

  rapor.baslik('ağ hatasında taranmıyor');
  const kopuk = await kurallariGetir('https://ornek.dev', {
    getir: async () => { throw new Error('bağlantı yok'); }
  });
  rapor.kontrol('Ulaşılamayan site taranmıyor', kopuk.taranabilir === false);
  rapor.kontrol('Hata mesajı taşınıyor', /bağlantı yok/.test(kopuk.sebep), kopuk.sebep);

  rapor.baslik('geçerli dosya okunuyor');
  let istenenAdres = null, gonderilenAjan = null;
  const iyi = await kurallariGetir('https://ornek.dev/', {
    getir: async (u, o) => {
      istenenAdres = u; gonderilenAjan = o.headers['User-Agent'];
      return { ok: true, status: 200, text: async () => 'User-agent: *\nDisallow: /sepet\n' };
    }
  });
  rapor.kontrol('Doğru adres isteniyor',
    istenenAdres === 'https://ornek.dev/robots.txt', String(istenenAdres));
  rapor.kontrol('Kendimizi tanıtıyoruz', gonderilenAjan === AJAN_ADI, String(gonderilenAjan));
  rapor.kontrol('Kurallar çözülmüş geliyor',
    yolaIzinVar(iyi.kurallar, '/sepet') === false && yolaIzinVar(iyi.kurallar, '/urun') === true);
}
