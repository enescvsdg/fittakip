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

const KOMUTLAR = {
  async gonder() {
    const liste = mevcutEgzersizler();
    console.log('egzersizler.js\'ten okundu: ' + liste.length + ' hareket');
    const sonuc = await cagir('/admin/mevcut', {
      method: 'POST', body: JSON.stringify({ egzersiz: liste })
    });
    console.log('Worker\'a yazıldı: ' + sonuc.kayit + ' kayıt.');
    console.log('\nArtık ajan çalışabilir:  node tools/veri.mjs calistir');
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
    const kutu = await cagir('/admin/onaylananlar?ajan=egzersiz');
    const kayitlar = kutu.egzersiz || [];
    if (!kayitlar.length) {
      console.log('Onaylanmış egzersiz kaydı yok. Panelde onayladıktan sonra tekrar çalıştır.');
      return;
    }
    console.log(kayitlar.length + ' onaylı kayıt alındı.');

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

    // İşlenen kayıtları kuyruktan düş ve ajanın yeni duruma bakmasını sağla
    await cagir('/admin/isaretle', {
      method: 'POST',
      body: JSON.stringify({ ajan: 'egzersiz', idler: kayitlar.map(k => k.id) })
    });
    const liste = mevcutEgzersizler();
    await cagir('/admin/mevcut', { method: 'POST', body: JSON.stringify({ egzersiz: liste }) });
    console.log('\nWorker güncellendi. Şimdi: npm test && git add -A && git commit');
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
  const komut = process.argv[2];
  if (!KOMUTLAR[komut]) {
    console.error('Kullanım: node tools/veri.mjs <' + Object.keys(KOMUTLAR).join('|') + '>');
    process.exit(1);
  }
  KOMUTLAR[komut]().catch(err => { console.error('\n' + err.message + '\n'); process.exit(1); });
}
