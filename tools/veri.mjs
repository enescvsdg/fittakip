#!/usr/bin/env node
/* ══════════════════════════════════════════
   VERİ KÖPRÜSÜ — uygulama ↔ Worker

     node tools/veri.mjs gonder   → uygulamanın mevcut listesini Worker'a yolla
     node tools/veri.mjs calistir → ajanları elle çalıştır
     node tools/veri.mjs bekleyen → onay kuyruğunda ne var, özetle
     node tools/veri.mjs al       → ONAYLADIKLARINI dosyalara işle

   Worker adresi ve panel anahtarı ortam değişkeninden okunuyor; repoda
   durmuyorlar:
     FITTAKIP_WORKER=https://fittakip-push.<alt-ad>.workers.dev
     FITTAKIP_ADMIN_KEY=<ADMIN_KEY secret'ının aynısı>
   ══════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dosyayiOku, dosyayiUret, birlestir } from './egzersiz-yaz.mjs';
import { birlestir as gidalariBirlestir } from './gida-birlestir.mjs';
import { execFileSync } from 'node:child_process';

const KOK = path.dirname(fileURLToPath(new URL('.', import.meta.url)));

function ayar() {
  const adres = (process.env.FITTAKIP_WORKER || '').replace(/\/+$/, '');
  const anahtar = process.env.FITTAKIP_ADMIN_KEY || '';
  if (!adres || !anahtar) {
    console.error('\nEksik ayar. Şunları tanımla:\n');
    console.error('  export FITTAKIP_WORKER=https://fittakip-push.<alt-adin>.workers.dev');
    console.error('  export FITTAKIP_ADMIN_KEY=<ADMIN_KEY secret\'inin aynisi>\n');
    console.error('Windows PowerShell\'de:');
    console.error('  $env:FITTAKIP_WORKER="https://..."');
    console.error('  $env:FITTAKIP_ADMIN_KEY="..."\n');
    process.exit(1);
  }
  return { adres, anahtar };
}

async function cagir(yol, secenek = {}) {
  const { adres, anahtar } = ayar();
  const res = await fetch(adres + yol, {
    ...secenek,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('admin:' + anahtar).toString('base64'),
      ...(secenek.headers || {})
    }
  });
  if (res.status === 401) {
    throw new Error('Panel anahtarı kabul edilmedi. FITTAKIP_ADMIN_KEY, Worker\'daki ' +
      'ADMIN_KEY secret\'ıyla birebir aynı olmalı.');
  }
  const metin = await res.text();
  let govde = null;
  try { govde = JSON.parse(metin); } catch { /* JSON değilse ham metin kalsın */ }
  if (!res.ok) {
    throw new Error('Worker ' + res.status + ' döndü: ' +
      (govde && govde.error ? govde.error : metin.slice(0, 200)));
  }
  return govde;
}

/* egzersizler.js'teki EXERCISES tanımını okur. Dosyayı çalıştırmıyoruz;
   yalnız o bloğu ayıklayıp değerlendiriyoruz. */
export function mevcutEgzersizler(dosya = path.join(KOK, 'egzersizler.js')) {
  const kaynak = fs.readFileSync(dosya, 'utf8');
  const bas = kaynak.indexOf('var EXERCISES');
  if (bas < 0) throw new Error('egzersizler.js içinde EXERCISES bulunamadı.');
  const son = kaynak.indexOf('\n};', bas);
  if (son < 0) throw new Error('EXERCISES tanımının sonu bulunamadı.');
  const blok = kaynak.slice(bas, son + 3);
  const EXERCISES = new Function(blok + '; return EXERCISES;')();
  const duz = [];
  for (const mekan of Object.keys(EXERCISES)) {
    for (const h of EXERCISES[mekan]) duz.push({ ...h, mekan });
  }
  return duz;
}

/* Service worker önbelleğini tazele. Dosyanın içeriği değişti ama CACHE_NAME
   aynı kalırsa telefondaki uygulama eski listeyi göstermeye devam eder —
   bunu elle hatırlamak yerine betik yapsın. */
function onbellegiTazele() {
  const yol = path.join(KOK, 'sw.js');
  const icerik = fs.readFileSync(yol, 'utf8');
  const m = icerik.match(/var CACHE_NAME = 'fit-takip-v(\d+)';/);
  if (!m) throw new Error('sw.js içinde CACHE_NAME bulunamadı.');
  const yeni = Number(m[1]) + 1;
  fs.writeFileSync(yol, icerik.replace(m[0], "var CACHE_NAME = 'fit-takip-v" + yeni + "';"));
  return { eski: Number(m[1]), yeni };
}

/* foods.js'teki TURKISH_FOODS'u düz bir listeye çevirir. Ajan "bu gıda bizde
   var mı" sorusunu buna bakarak yanıtlıyor. */
export function mevcutGidalar(dosya = path.join(KOK, 'foods.js')) {
  const kaynak = fs.readFileSync(dosya, 'utf8');
  const bas = kaynak.indexOf('var TURKISH_FOODS');
  if (bas < 0) throw new Error('foods.js içinde TURKISH_FOODS bulunamadı.');
  const FOODS = new Function(kaynak.slice(bas) + '; return TURKISH_FOODS;')();
  const duz = [];
  for (const kategori of Object.keys(FOODS)) {
    for (const g of FOODS[kategori]) duz.push({ ...g, kategori });
  }
  return duz;
}

const KOMUTLAR = {
  async gonder() {
    const liste = mevcutEgzersizler();
    const gida = mevcutGidalar();
    const usdaIstek = JSON.parse(fs.readFileSync(path.join(KOK, 'tools/veri/usda-istek.json'), 'utf8'));
    console.log('egzersizler.js: ' + liste.length + ' hareket');
    console.log('foods.js      : ' + gida.length + ' gıda');
    console.log('istek listesi : ' + usdaIstek.gidalar.length + ' kalem');
    const sonuc = await cagir('/admin/mevcut', {
      method: 'POST', body: JSON.stringify({ egzersiz: liste, gida, usdaIstek })
    });
    console.log('\nWorker\'a yazıldı: ' + JSON.stringify(sonuc.yazilan));
    console.log('Artık ajanlar çalışabilir:  node tools/veri.mjs calistir');
  },

  async calistir() {
    console.log('Ajanlar çalıştırılıyor, bu biraz sürebilir…');
    const rapor = await cagir('/admin/calistir', {
      method: 'POST', body: JSON.stringify({})
    });
    for (const [ad, s] of Object.entries(rapor)) {
      if (!s.ok) { console.log('  ' + ad + ': HATA — ' + s.hata); continue; }
      console.log('  ' + ad + ': ' + s.yeni + ' yeni, ' + s.guncel + ' güncelleme, ' +
        s.atlanan + ' atlandı, kuyrukta ' + s.toplam);
    }
    console.log('\nPanelde incele:  ' + (process.env.FITTAKIP_WORKER || '').replace(/\/+$/, '') + '/admin');
  },

  async al() {
    const hepsi = await cagir('/admin/onaylananlar');
    const egzersizKayitlari = hepsi.egzersiz || [];
    const gidaKayitlari = hepsi.gida || [];

    if (!egzersizKayitlari.length && !gidaKayitlari.length) {
      console.log('Onaylanmış kayıt yok. Panelde onayladıktan sonra tekrar çalıştır.');
      return;
    }

    if (gidaKayitlari.length) await KOMUTLAR._gidalariIsle(gidaKayitlari);
    if (!egzersizKayitlari.length) {
      const onbellek = onbellegiTazele();
      console.log('  önbellek     : v' + onbellek.eski + ' → v' + onbellek.yeni);
      await cagir('/admin/isaretle', {
        method: 'POST',
        body: JSON.stringify({ ajan: 'gida', idler: gidaKayitlari.map(k => k.id) })
      });
      await KOMUTLAR._durumuGonder();
      console.log('\nWorker güncellendi. Şimdi: npm test && git add -A && git commit');
      return;
    }

    const kayitlar = egzersizKayitlari;
    console.log(kayitlar.length + ' onaylı egzersiz kaydı alındı.');

    const yol = path.join(KOK, 'egzersizler.js');
    const once = fs.readFileSync(yol, 'utf8');
    const { EXERCISES, EXERCISE_INFO } = dosyayiOku(once);
    const oncekiSayi = Object.values(EXERCISES).reduce((n, v) => n + v.length, 0);

    const sonuc = birlestir(EXERCISES, EXERCISE_INFO, kayitlar);
    const metin = dosyayiUret(once, sonuc.EXERCISES, sonuc.EXERCISE_INFO);

    // Yazmadan önce çalıştırılabilir mi diye bak — bozuk dosya yazmayalım
    try {
      new Function(metin.slice(metin.indexOf('var EXERCISES')));
    } catch (err) {
      throw new Error('Üretilen egzersizler.js çalıştırılamıyor, yazılmadı: ' + err.message);
    }

    fs.writeFileSync(yol, metin);
    const sonrakiSayi = Object.values(sonuc.EXERCISES).reduce((n, v) => n + v.length, 0);

    console.log('\negzersizler.js güncellendi:');
    console.log('  hareket      : ' + oncekiSayi + ' → ' + sonrakiSayi +
      '  (' + sonuc.rapor.hareketEklendi + ' yeni)');
    console.log('  talimat/kas  : ' + Object.keys(sonuc.EXERCISE_INFO).length +
      ' harekette  (' + sonuc.rapor.bilgiEklendi + ' işlendi)');
    if (sonuc.rapor.atlanan) {
      console.log('  atlanan      : ' + sonuc.rapor.atlanan);
      for (const a of sonuc.rapor.atlananlar.slice(0, 8)) console.log('     · ' + a);
      if (sonuc.rapor.atlananlar.length > 8) {
        console.log('     · … ve ' + (sonuc.rapor.atlananlar.length - 8) + ' tane daha');
      }
    }

    const onbellek = onbellegiTazele();
    console.log('  önbellek     : v' + onbellek.eski + ' → v' + onbellek.yeni);

    // İşlenen kayıtları kuyruktan düş ve ajanların yeni duruma bakmasını sağla
    await cagir('/admin/isaretle', {
      method: 'POST',
      body: JSON.stringify({ ajan: 'egzersiz', idler: kayitlar.map(k => k.id) })
    });
    if (gidaKayitlari.length) {
      await cagir('/admin/isaretle', {
        method: 'POST',
        body: JSON.stringify({ ajan: 'gida', idler: gidaKayitlari.map(k => k.id) })
      });
    }
    await KOMUTLAR._durumuGonder();
    console.log('\nWorker güncellendi. Şimdi: npm test && git add -A && git commit');
  },

  /* Gıda kayıtları foods.js'e doğrudan yazılmıyor: kaynak dosyaya işlenip
     gida-topla.mjs yeniden üretiyor. Böylece doğrulama kapısı devreye giriyor
     ve saçma bir değer dosyaya hiç ulaşmıyor. */
  async _gidalariIsle(kayitlar) {
    console.log(kayitlar.length + ' onaylı gıda kaydı alındı.');
    const yol = path.join(KOK, 'tools/veri/temel-gidalar.json');
    const kategoriler = JSON.parse(fs.readFileSync(yol, 'utf8'));
    const oncekiSayi = kategoriler.reduce((n, k) => n + k.gidalar.length, 0);

    const sonuc = gidalariBirlestir(kategoriler, kayitlar);
    fs.writeFileSync(yol, JSON.stringify(sonuc.kategoriler, null, 1) + '\n');

    /* Üretici aynı zamanda doğrulama kapısı: bir kayıt süzgeçten geçmezse
       foods.js'i hiç yazmıyor ve hata veriyor. */
    try {
      execFileSync(process.execPath, [path.join(KOK, 'tools/gida-topla.mjs')],
        { cwd: KOK, stdio: 'inherit' });
    } catch (err) {
      throw new Error('Gıda doğrulama kapısı kayıtları geçirmedi. ' +
        'temel-gidalar.json güncellendi ama foods.js yazılmadı — ' +
        'yukarıdaki hataları düzeltip "node tools/gida-topla.mjs" çalıştır.');
    }

    const sonrakiSayi = sonuc.kategoriler.reduce((n, k) => n + k.gidalar.length, 0);
    console.log('\nfoods.js güncellendi:');
    console.log('  gıda         : ' + oncekiSayi + ' → ' + sonrakiSayi +
      '  (' + sonuc.rapor.eklenen + ' yeni, ' + sonuc.rapor.guncellenen + ' güncelleme)');
    if (sonuc.rapor.atlanan) {
      console.log('  atlanan      : ' + sonuc.rapor.atlanan);
      for (const a of sonuc.rapor.atlananlar.slice(0, 6)) console.log('     · ' + a);
    }
  },

  /* Ajanların "uygulamada şu an ne var" bilgisini tazele. */
  async _durumuGonder() {
    const usdaIstek = JSON.parse(
      fs.readFileSync(path.join(KOK, 'tools/veri/usda-istek.json'), 'utf8'));
    await cagir('/admin/mevcut', {
      method: 'POST',
      body: JSON.stringify({
        egzersiz: mevcutEgzersizler(), gida: mevcutGidalar(), usdaIstek
      })
    });
  },

  async bekleyen() {
    const veri = await cagir('/admin/veri');
    for (const a of veri.ajanlar) {
      console.log('\n── ' + a.ad + ' ── ' + a.bekleyen.length + ' bekliyor, ' +
        a.onayliSayi + ' onaylı');
      const gruplar = {};
      for (const k of a.bekleyen) gruplar[k.grup] = (gruplar[k.grup] || 0) + 1;
      for (const [g, n] of Object.entries(gruplar).sort((x, y) => y[1] - x[1])) {
        console.log('   ' + String(n).padStart(4) + '  ' + g);
      }
      const supheli = a.bekleyen.filter(k => k.supheli).length;
      if (supheli) console.log('   ' + String(supheli).padStart(4) + '  ⚠ şüpheli işaretli');
    }
    console.log();
  }
};

/* Doğrudan çalıştırıldığında komut dağıtıcısı devreye girsin; testler bu
   dosyayı içe aktardığında girmesin. */
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Alt çizgiyle başlayanlar iç yardımcı, komut değil
  const acik = Object.keys(KOMUTLAR).filter(k => !k.startsWith('_'));
  const komut = process.argv[2];
  if (!acik.includes(komut)) {
    console.error('Kullanım: node tools/veri.mjs <' + acik.join('|') + '>');
    process.exit(1);
  }
  KOMUTLAR[komut]().catch(err => { console.error('\n' + err.message + '\n'); process.exit(1); });
}
