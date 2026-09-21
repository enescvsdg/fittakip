document.documentElement.lang='tr';

var veri={ajanlar:[]}, aktif=null, secili={}, mesgul=false;
var icerik=document.getElementById('icerik');

/* Ajanlar bin kayda kadar getirebiliyor. Hepsini birden çizmek telefonu
   kilitliyor, hepsini tek tek gözden geçirmek de gerçekçi değil — bu yüzden
   süzgeç, arama ve çizim sınırı var. */
var CIZIM_ADIMI = 60;
var cizimSiniri = CIZIM_ADIMI;
var aramaMetni = '';
var aktifSuzgec = 'tumu';

var SUZGECLER = [
  { id:'tumu',       ad:'Tümü',        uyar:function(){ return true; } },
  { id:'supheli',    ad:'Şüpheli',     uyar:function(k){ return !!k.supheli; } },
  { id:'temiz',      ad:'Temiz',       uyar:function(k){ return !k.supheli; } },
  { id:'yeni',       ad:'Yeni',        uyar:function(k){ return k.tur==='yeni'; } },
  { id:'guncelleme', ad:'Güncelleme',  uyar:function(k){ return k.tur==='guncelleme'; } }
];

function suzgeciBul(id){
  return SUZGECLER.find(function(x){return x.id===id;}) || SUZGECLER[0];
}

function aramayaUyar(k){
  if (!aramaMetni) return true;
  var t = aramaMetni.toLocaleLowerCase('tr');
  return String(k.ad||'').toLocaleLowerCase('tr').indexOf(t) >= 0 ||
         String(k.grup||'').toLocaleLowerCase('tr').indexOf(t) >= 0;
}

function suzulmus(liste){
  var uyar = suzgeciBul(aktifSuzgec).uyar;
  return liste.filter(function(k){ return uyar(k) && aramayaUyar(k); });
}

function ajanBul(id){ return veri.ajanlar.find(function(a){return a.id===id;}); }
function bekleyen(){ return veri.ajanlar.reduce(function(n,a){return n+a.bekleyen.length;},0); }

async function cagir(yol,secenek){
  var r=await fetch(yol,Object.assign({credentials:'same-origin',
    headers:{'Content-Type':'application/json'}},secenek||{}));
  if(r.status===401){ throw new Error('Yetki düştü. Sayfayı yenile ve anahtarı tekrar gir.'); }
  if(!r.ok){ throw new Error('Sunucu '+r.status+' döndü.'); }
  return r.json();
}

function hataGoster(m){
  icerik.innerHTML='<p class="bos" style="color:var(--kirmizi)">'+m+'</p>';
}

async function yukle(){
  try{
    veri=await cagir('/admin/veri');
    if(!aktif||!ajanBul(aktif)){
      var dolu=veri.ajanlar.find(function(a){return a.bekleyen.length;});
      aktif=(dolu||veri.ajanlar[0]||{}).id||null;
    }
    ciz();
  }catch(e){ hataGoster(e.message); }
}

function zamanMetni(iso){
  if(!iso) return 'henüz çalışmadı';
  var d=new Date(iso);
  if(isNaN(d)) return 'bilinmiyor';
  return new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short',
    timeZone:'Europe/Istanbul'}).format(d);
}

function sekmeleriCiz(){
  var s=document.getElementById('sekmeler');
  s.innerHTML='';
  veri.ajanlar.forEach(function(a){
    var b=document.createElement('button');
    b.type='button'; b.className='sekme';
    b.setAttribute('aria-pressed',String(a.id===aktif));
    b.innerHTML=a.ad+'<span class="n">'+a.bekleyen.length+'</span>';
    b.addEventListener('click',function(){
      aktif=a.id; cizimSiniri=CIZIM_ADIMI; aktifSuzgec='tumu'; ciz();
    });
    s.appendChild(b);
  });
  var a=ajanBul(aktif);
  document.getElementById('calisma').innerHTML= a
    ? 'Kaynak: <b>'+a.kaynak+'</b> · Son çalışma: '+
      zamanMetni(a.calisma&&a.calisma.an)+
      (a.calisma?' ('+a.calisma.yeni+' yeni, '+a.calisma.guncel+' güncelleme)':'')+
      ' · Onaylanmayan kayıt uygulamaya <b>girmez</b>.'
    : 'Ajan bulunamadı.';
  document.getElementById('ozet').textContent=bekleyen()+' kayıt onay bekliyor';
}

function suzgecleriCiz(){
  var kap=document.getElementById('suzgecCipler');
  if(!kap) return;
  var a=ajanBul(aktif);
  var liste=a?a.bekleyen:[];
  kap.innerHTML='';
  SUZGECLER.forEach(function(sz){
    var n=liste.filter(function(k){ return sz.uyar(k) && aramayaUyar(k); }).length;
    var b=document.createElement('button');
    b.type='button'; b.className='scip';
    b.setAttribute('aria-pressed',String(sz.id===aktifSuzgec));
    b.innerHTML=sz.ad+'<span class="n">'+n+'</span>';
    /* Boş süzgeci tıklanabilir bırakmak "bozuk mu" hissi veriyor */
    if(!n && sz.id!==aktifSuzgec) b.disabled=true;
    b.addEventListener('click',function(){
      aktifSuzgec=sz.id; cizimSiniri=CIZIM_ADIMI; ciz();
    });
    kap.appendChild(b);
  });
}

function farkCiz(f){
  return '<div class="fark">'+f.map(function(r){
    return '<span class="k">'+r[0]+'</span><span class="e">'+r[1]+'</span>'+
           '<span class="ok">→</span><span class="y '+(r[3]||'')+'">'+r[2]+'</span>';
  }).join('')+'</div>';
}

/* Kayıt metinleri ajanlardan geliyor; ajanların bir kısmı dış siteden veri
   okuyor. Panele HTML olarak basmadan önce kaçırılıyor — bir ürün sayfasındaki
   <script> paneli ele geçirmesin. Kalınlaştırma gibi biçimlendirmeleri ajanlar
   değil panel koyuyor. */
function kacir(t){
  return String(t==null?'':t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function kayitCiz(k,i){
  var el=document.createElement('div');
  el.className='kayit'+(k.supheli?' supheli':'')+(secili[k.id]?' secili':'');
  var et = k.tur==='yeni'
    ? '<span class="etiket yeni">Yeni</span>'
    : '<span class="etiket gun">Güncelleme</span>';
  if(k.supheli) et+='<span class="etiket sup">Şüpheli</span>';
  el.innerHTML=
    '<input type="checkbox" id="k'+i+'"'+(secili[k.id]?' checked':'')+
      ' aria-label="'+kacir(k.ad)+' kaydını seç">'+
    '<div class="govde">'+
      '<div class="bas"><label class="ad" for="k'+i+'">'+kacir(k.ad)+'</label>'+et+'</div>'+
      (k.deger?'<p class="deger">'+kacir(k.deger)+'</p>':'')+
      (Array.isArray(k.fark)&&k.fark.length?farkCiz(k.fark.map(function(r){
        return [kacir(r[0]),kacir(r[1]),kacir(r[2]),r[3]==='arti'||r[3]==='eksi'?r[3]:''];
      })):'')+
      (Array.isArray(k.metin)?'<div class="aciklama" style="display:flex;flex-direction:column;gap:5px">'+
        k.metin.map(function(m){return '<span>'+kacir(m)+'</span>';}).join('')+'</div>':'')+
      (k.aciklama?'<p class="aciklama">'+kacir(k.aciklama)+'</p>':'')+
      (k.uyari?'<p class="uyari-kutu"><b>Dikkat:</b> '+kacir(k.uyari)+'</p>':'')+
      (Array.isArray(k.talimat)&&k.talimat.length
        ?'<details class="talimat"><summary>Talimatı göster</summary><ol>'+
          k.talimat.map(function(t){return '<li>'+kacir(t)+'</li>';}).join('')+'</ol></details>':'')+
      (k.kaynakBag?'<p class="kaynak-bag">'+kacir(k.kaynakBag)+'</p>':'')+
    '</div>';
  el.querySelector('input').addEventListener('change',function(e){
    if(e.target.checked) secili[k.id]={ajan:k.ajan,id:k.id}; else delete secili[k.id];
    el.classList.toggle('secili',e.target.checked);
    sayaciGuncelle();
  });
  return el;
}

function ciz(){
  sekmeleriCiz();
  suzgecleriCiz();
  icerik.innerHTML='';
  var a=ajanBul(aktif);
  var tumListe=a?a.bekleyen:[];
  if(!tumListe.length){
    icerik.innerHTML='<p class="bos">Bu ajandan bekleyen kayıt yok.</p>';
    onayliCiz(); sayaciGuncelle(); return;
  }

  var liste=suzulmus(tumListe);
  if(!liste.length){
    icerik.innerHTML='<p class="sonuc-yok">Bu süzgeç ve aramayla eşleşen kayıt yok.</p>';
    onayliCiz(); sayaciGuncelle(); return;
  }

  /* Çizim sınırı grupların TAMAMINA uygulanıyor, grup başına değil: bir grupta
     400 kayıt varsa onu da bölmek gerekiyor. */
  var cizilen=0;
  var gruplar=[];
  liste.forEach(function(k){
    var ad=k.grup||'Kayıtlar';
    var g=gruplar.find(function(x){return x.ad===ad;});
    if(!g){ g={ad:ad,kayitlar:[]}; gruplar.push(g); }
    g.kayitlar.push(k);
  });

  gruplar.forEach(function(g,gi){
    if(cizilen>=cizimSiniri) return;
    var gosterilecek=g.kayitlar.slice(0, cizimSiniri-cizilen);
    cizilen+=gosterilecek.length;

    var bol=document.createElement('section');
    bol.className='grup';
    var kalanGrupta=g.kayitlar.length-gosterilecek.length;
    bol.innerHTML='<div class="grup-bas"><h2>'+kacir(g.ad)+'</h2>'+
      '<span class="kac">'+g.kayitlar.length+' kayıt'+
        (kalanGrupta?' · '+gosterilecek.length+' gösteriliyor':'')+'</span>'+
      '<span class="grup-eylem">'+
        '<button type="button" class="tumu">Tümünü seç</button>'+
        '<button type="button" class="grubu-onayla">Grubu onayla</button>'+
      '</span></div>'+
      '<div class="kayitlar"></div>';

    var kap=bol.querySelector('.kayitlar');
    gosterilecek.forEach(function(k,i){ kap.appendChild(kayitCiz(k,gi+'-'+i)); });

    /* "Tümünü seç" grubun TAMAMINI seçiyor, yalnız çizileni değil — kaç kayıt
       olduğu başlıkta yazıyor, kullanıcı ne seçtiğini görüyor. */
    bol.querySelector('.tumu').addEventListener('click',function(){
      var hepsi=g.kayitlar.every(function(k){return secili[k.id];});
      g.kayitlar.forEach(function(k){
        if(hepsi) delete secili[k.id]; else secili[k.id]={ajan:k.ajan,id:k.id};
      });
      ciz();
    });

    /* Toplu onay: seçip sonra onaylamaya gerek kalmadan grubun tamamı.
       Şüpheli kayıtlar varsa sayısı uyarıda söyleniyor — onlar gözle
       bakılsın diye işaretlenmişti, sessizce onaylanmasın. */
    var onaylaBtn=bol.querySelector('.grubu-onayla');
    onaylaBtn.disabled=mesgul;
    onaylaBtn.addEventListener('click',function(){
      var supheli=g.kayitlar.filter(function(k){return k.supheli;}).length;
      var soru=g.ad+' grubundaki '+g.kayitlar.length+' kayıt onaylanacak.';
      if(supheli) soru+='\n\nBunların '+supheli+' tanesi ŞÜPHELİ işaretli — '+
        'değerleri gözle doğrulanmadan onaylanmamalı.';
      soru+='\n\nDevam edilsin mi?';
      if(!confirm(soru)) return;
      kararGonder('onay', g.kayitlar.map(function(k){
        return {ajan:k.ajan,id:k.id,karar:'onay'};
      }));
    });

    icerik.appendChild(bol);
  });

  var kalan=liste.length-cizilen;
  if(kalan>0){
    var daha=document.createElement('button');
    daha.type='button'; daha.className='daha';
    daha.textContent='Daha fazla göster ('+kalan+' kayıt kaldı)';
    daha.addEventListener('click',function(){ cizimSiniri+=CIZIM_ADIMI; ciz(); });
    icerik.appendChild(daha);
  }

  onayliCiz();
  sayaciGuncelle();
}

function sayaciGuncelle(){
  var n=Object.keys(secili).length;
  document.getElementById('sayac').textContent=mesgul?'kaydediliyor…':(n+' seçili');
  document.getElementById('onayBtn').disabled=!n||mesgul;
  document.getElementById('redBtn').disabled=!n||mesgul;
  document.getElementById('onayBtn').textContent=n?'Onayla ('+n+')':'Onayla';
}

function onayliCiz(){
  var bol=document.getElementById('onayliBolum');
  var ul=document.getElementById('onayliListe');
  var toplam=veri.ajanlar.reduce(function(n,a){return n+(a.onayliSayi||0);},0);
  bol.hidden=!toplam;
  ul.innerHTML='';
  if(!toplam) return;
  veri.ajanlar.forEach(function(a){
    if(!a.onayliSayi) return;
    var li=document.createElement('li');
    li.innerHTML='<span class="ad">'+kacir(a.ad)+'</span>'+
      '<span class="kim">'+a.onayliSayi+' kayıt işlenmeyi bekliyor</span>';
    ul.appendChild(li);
  });
}

async function kararGonder(karar, hazirListe){
  if(mesgul) return;
  var liste=hazirListe || Object.keys(secili).map(function(id){
    return {ajan:secili[id].ajan,id:secili[id].id,karar:karar};
  });
  if(!liste.length) return;
  mesgul=true; sayaciGuncelle();
  try{
    await cagir('/admin/karar',{method:'POST',body:JSON.stringify({kararlar:liste})});
    secili={};
    await yukle();
  }catch(e){
    alert(e.message);
  }finally{
    mesgul=false; sayaciGuncelle();
  }
}

document.getElementById('onayBtn').addEventListener('click',function(){ kararGonder('onay'); });
document.getElementById('redBtn').addEventListener('click',function(){ kararGonder('ret'); });

var araKutusu=document.getElementById('ara');
if(araKutusu){
  var araZaman=null;
  araKutusu.addEventListener('input',function(){
    /* Her tuş vuruşunda bin kaydı yeniden çizmek telefonu kilitliyor */
    clearTimeout(araZaman);
    araZaman=setTimeout(function(){
      aramaMetni=araKutusu.value.trim();
      cizimSiniri=CIZIM_ADIMI;
      ciz();
    },180);
  });
}

yukle();
