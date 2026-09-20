/* ══════════════════════════════════════════
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
  'Tahıllar / Karbonhidrat': [
    { name: 'Pirinç (pişmiş)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, kaynak: 'elle' },
    { name: 'Bulgur (pişmiş)', kcal: 83, protein: 3.1, carbs: 18.6, fat: 0.2, kaynak: 'elle' },
    { name: 'Yulaf Ezmesi (çiğ)', kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, kaynak: 'elle' },
    { name: 'Makarna (pişmiş)', kcal: 131, protein: 5, carbs: 25, fat: 1.1, kaynak: 'elle' },
    { name: 'Ekmek (beyaz)', kcal: 265, protein: 9, carbs: 49, fat: 3.2, kaynak: 'elle' },
    { name: 'Tam Buğday Ekmeği', kcal: 247, protein: 13, carbs: 41, fat: 3.4, kaynak: 'elle' },
    { name: 'Karabuğday (pişmiş)', kcal: 92, protein: 3.4, carbs: 19.9, fat: 0.6, kaynak: 'elle' },
    { name: 'Tatlı Patates (haşlanmış)', kcal: 76, protein: 1.4, carbs: 17.7, fat: 0.1, kaynak: 'elle' },
    { name: 'Patates (haşlanmış)', kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, kaynak: 'elle' },
    { name: 'Basmati Pirinç (pişmiş)', kcal: 121, protein: 2.5, carbs: 25.2, fat: 0.4, kaynak: 'elle' },
    { name: 'Pirinç Pilavı (tereyağlı)', kcal: 165, protein: 2.5, carbs: 28, fat: 4, kaynak: 'elle' },
    { name: 'Bulgur Pilavı (yağlı)', kcal: 128, protein: 3.2, carbs: 19, fat: 3.8, kaynak: 'elle' },
    { name: 'Pirinç (çiğ)', kcal: 360, protein: 6.6, carbs: 79.3, fat: 0.6, kaynak: 'elle' },
    { name: 'Bulgur (çiğ)', kcal: 342, protein: 12.3, carbs: 75.9, fat: 1.3, kaynak: 'elle' },
    { name: 'Buğday Unu', kcal: 364, protein: 10.3, carbs: 76.3, fat: 1, kaynak: 'elle' },
    { name: 'İrmik', kcal: 360, protein: 12.7, carbs: 72.8, fat: 1.1, kaynak: 'elle' },
    { name: 'Şehriye (çiğ)', kcal: 358, protein: 12, carbs: 73, fat: 1.5, kaynak: 'elle' },
    { name: 'Tarhana (kuru)', kcal: 348, protein: 12, carbs: 68, fat: 3, kaynak: 'elle' }
  ],
  'Et, Tavuk, Balık, Yumurta': [
    { name: 'Tavuk Göğsü (ızgara/haşlama)', kcal: 165, protein: 31, carbs: 0, fat: 3.6, kaynak: 'elle' },
    { name: 'Hindi Göğsü', kcal: 135, protein: 30, carbs: 0, fat: 1, kaynak: 'elle' },
    { name: 'Yağsız Kıyma (%5)', kcal: 137, protein: 21, carbs: 0, fat: 5, kaynak: 'elle' },
    { name: 'Dana Bonfile', kcal: 143, protein: 26, carbs: 0, fat: 4, kaynak: 'elle' },
    { name: 'Somon (pişmiş)', kcal: 208, protein: 20, carbs: 0, fat: 13, kaynak: 'elle' },
    { name: 'Levrek', kcal: 97, protein: 18.4, carbs: 0, fat: 2.5, kaynak: 'elle' },
    { name: 'Ton Balığı (suda, süzülmüş)', kcal: 116, protein: 26, carbs: 0, fat: 1, kaynak: 'elle' },
    { name: 'Yumurta (tam)', kcal: 155, protein: 13, carbs: 1.1, fat: 11, boylar: { S: 44, M: 51, L: 60 }, kaynak: 'elle' },
    { name: 'Yumurta Akı', kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, boylar: { S: 29, M: 33, L: 39 }, kaynak: 'elle' },
    { name: 'Kıyma (%15 yağlı)', kcal: 254, protein: 17.2, carbs: 0, fat: 20, kaynak: 'elle' },
    { name: 'Kuzu Kıyma', kcal: 282, protein: 16.6, carbs: 0, fat: 23.4, kaynak: 'elle' },
    { name: 'Kuşbaşı Dana Eti', kcal: 182, protein: 20.5, carbs: 0, fat: 11, kaynak: 'elle' },
    { name: 'Tavuk But (derisiz)', kcal: 177, protein: 24, carbs: 0, fat: 8.6, kaynak: 'elle' },
    { name: 'Sucuk', kcal: 400, protein: 22, carbs: 2, fat: 34, kaynak: 'elle' }
  ],
  'Süt Ürünleri': [
    { name: 'Lor Peyniri', kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, kaynak: 'elle' },
    { name: 'Yoğurt (sade, tam yağlı)', kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, kaynak: 'elle' },
    { name: 'Süzme Yoğurt (Quark)', kcal: 65, protein: 10, carbs: 3.6, fat: 0.2, kaynak: 'elle' },
    { name: 'Süt (tam yağlı)', kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, kaynak: 'elle' },
    { name: 'Beyaz Peynir', kcal: 264, protein: 17, carbs: 1.5, fat: 21, kaynak: 'elle' },
    { name: 'Kaşar Peyniri', kcal: 371, protein: 25, carbs: 1.5, fat: 29, kaynak: 'elle' },
    { name: 'Whey Protein Tozu', kcal: 380, protein: 80, carbs: 8, fat: 4, kaynak: 'elle' },
    { name: 'Tereyağı', kcal: 717, protein: 0.9, carbs: 0.1, fat: 81.1, kaynak: 'elle' },
    { name: 'Kaymak', kcal: 330, protein: 3, carbs: 3.5, fat: 34, kaynak: 'elle' },
    { name: 'Labne', kcal: 255, protein: 6, carbs: 4, fat: 24, kaynak: 'elle' }
  ],
  'Sebze': [
    { name: 'Brokoli (haşlanmış)', kcal: 35, protein: 2.4, carbs: 7.2, fat: 0.4, kaynak: 'elle' },
    { name: 'Karnabahar (haşlanmış)', kcal: 23, protein: 1.8, carbs: 4.1, fat: 0.5, kaynak: 'elle' },
    { name: 'Domates', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, kaynak: 'elle' },
    { name: 'Salatalık', kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, kaynak: 'elle' },
    { name: 'Marul', kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, kaynak: 'elle' },
    { name: 'Ispanak (haşlanmış)', kcal: 23, protein: 3, carbs: 3.6, fat: 0.3, kaynak: 'elle' },
    { name: 'Kabak (haşlanmış)', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, kaynak: 'elle' },
    { name: 'Roka', kcal: 25, protein: 2.6, carbs: 3.7, fat: 0.7, kaynak: 'elle' },
    { name: 'Kuşkonmaz', kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1, kaynak: 'elle' },
    { name: 'Soğan', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, kaynak: 'elle' },
    { name: 'Sarımsak', kcal: 149, protein: 6.4, carbs: 33.1, fat: 0.5, kaynak: 'elle' },
    { name: 'Patlıcan', kcal: 25, protein: 1, carbs: 5.9, fat: 0.2, kaynak: 'elle' },
    { name: 'Biber (yeşil sivri)', kcal: 20, protein: 0.9, carbs: 4.6, fat: 0.2, kaynak: 'elle' },
    { name: 'Havuç', kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, kaynak: 'elle' },
    { name: 'Yeşil Fasulye', kcal: 31, protein: 1.8, carbs: 7, fat: 0.2, kaynak: 'elle' },
    { name: 'Ispanak (çiğ)', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, kaynak: 'elle' },
    { name: 'Lahana', kcal: 25, protein: 1.3, carbs: 5.8, fat: 0.1, kaynak: 'elle' },
    { name: 'Pırasa', kcal: 61, protein: 1.5, carbs: 14.2, fat: 0.3, kaynak: 'elle' },
    { name: 'Kereviz', kcal: 42, protein: 0.9, carbs: 9.2, fat: 0.2, kaynak: 'elle' },
    { name: 'Bezelye', kcal: 81, protein: 5.4, carbs: 14.5, fat: 0.4, kaynak: 'elle' },
    { name: 'Maydanoz', kcal: 36, protein: 3, carbs: 6.3, fat: 0.8, kaynak: 'elle' },
    { name: 'Domates Salçası', kcal: 82, protein: 4.3, carbs: 18.9, fat: 0.5, kaynak: 'elle' },
    { name: 'Su', kcal: 0, protein: 0, carbs: 0, fat: 0, kaynak: 'elle' }
  ],
  'Meyve': [
    { name: 'Elma', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, kaynak: 'elle' },
    { name: 'Muz', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, kaynak: 'elle' },
    { name: 'Yaban Mersini', kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3, kaynak: 'elle' },
    { name: 'Portakal', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, kaynak: 'elle' },
    { name: 'Orman Meyvesi Karışımı', kcal: 50, protein: 0.8, carbs: 12, fat: 0.3, kaynak: 'elle' },
    { name: 'Limon Suyu', kcal: 22, protein: 0.4, carbs: 6.9, fat: 0.2, kaynak: 'elle' },
    { name: 'Kuru Üzüm', kcal: 299, protein: 3.1, carbs: 79.2, fat: 0.5, kaynak: 'elle' },
    { name: 'Kuru Kayısı', kcal: 241, protein: 3.4, carbs: 62.6, fat: 0.5, kaynak: 'elle' }
  ],
  'Kuruyemiş / Yağlar': [
    { name: 'Çiğ Badem', kcal: 579, protein: 21, carbs: 22, fat: 50, kaynak: 'elle' },
    { name: 'Ceviz', kcal: 654, protein: 15, carbs: 14, fat: 65, kaynak: 'elle' },
    { name: 'Zeytinyağı', kcal: 884, protein: 0, carbs: 0, fat: 100, kaynak: 'elle' },
    { name: 'Fıstık Ezmesi', kcal: 588, protein: 25, carbs: 20, fat: 50, kaynak: 'elle' },
    { name: 'Ayçiçek Yağı', kcal: 884, protein: 0, carbs: 0, fat: 100, kaynak: 'elle' },
    { name: 'Tahin', kcal: 595, protein: 17, carbs: 21, fat: 53.8, kaynak: 'elle' },
    { name: 'Fındık', kcal: 628, protein: 15, carbs: 16.7, fat: 60.8, kaynak: 'elle' },
    { name: 'Toz Şeker', kcal: 387, protein: 0, carbs: 100, fat: 0, kaynak: 'elle' },
    { name: 'Bal', kcal: 304, protein: 0.3, carbs: 82.4, fat: 0, kaynak: 'elle' },
    { name: 'Pekmez', kcal: 293, protein: 0.6, carbs: 73, fat: 0.1, kaynak: 'elle' }
  ],
  'Bakliyat': [
    { name: 'Mercimek (pişmiş)', kcal: 116, protein: 9, carbs: 20, fat: 0.4, kaynak: 'elle' },
    { name: 'Nohut (pişmiş)', kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, kaynak: 'elle' },
    { name: 'Kırmızı Mercimek (çiğ)', kcal: 358, protein: 24, carbs: 63, fat: 1.1, kaynak: 'elle' },
    { name: 'Yeşil Mercimek (çiğ)', kcal: 352, protein: 24.6, carbs: 63.4, fat: 1.1, kaynak: 'elle' },
    { name: 'Kuru Fasulye (çiğ)', kcal: 333, protein: 23.4, carbs: 60.3, fat: 0.8, kaynak: 'elle' },
    { name: 'Nohut (çiğ)', kcal: 378, protein: 20.5, carbs: 63, fat: 6, kaynak: 'elle' }
  ],
  'Yemekler': [
    { name: 'Mercimek Çorbası', kcal: 56, protein: 2.9, carbs: 8.2, fat: 1.3, kaynak: 'tarif', tarif: 'Kırmızı Mercimek (çiğ) 200g, Soğan 80g, Havuç 60g, Zeytinyağı 20g, Su 1500g' },
    { name: 'Ezogelin Çorbası', kcal: 64, protein: 3.1, carbs: 10.9, fat: 1.1, kaynak: 'tarif', tarif: 'Kırmızı Mercimek (çiğ) 180g, Bulgur (çiğ) 60g, Pirinç (çiğ) 30g, Soğan 80g, Domates Salçası 30g, Tereyağı 20g, Su 1600g' },
    { name: 'Tarhana Çorbası', kcal: 36, protein: 1, carbs: 5.5, fat: 1.2, kaynak: 'tarif', tarif: 'Tarhana (kuru) 100g, Domates Salçası 20g, Tereyağı 15g, Su 1200g' },
    { name: 'Yayla Çorbası', kcal: 47, protein: 1.7, carbs: 5.1, fat: 2.2, kaynak: 'tarif', tarif: 'Yoğurt (sade, tam yağlı) 400g, Pirinç (çiğ) 60g, Yumurta (tam) 50g, Tereyağı 20g, Buğday Unu 20g, Su 1200g' },
    { name: 'Kuru Fasulye', kcal: 95, protein: 4.9, carbs: 13.2, fat: 2.8, kaynak: 'tarif', tarif: 'Kuru Fasulye (çiğ) 300g, Soğan 100g, Domates Salçası 40g, Zeytinyağı 40g, Su 1200g' },
    { name: 'Nohut Yemeği (etli)', kcal: 115, protein: 6.6, carbs: 12.9, fat: 4.4, kaynak: 'tarif', tarif: 'Nohut (çiğ) 300g, Kuşbaşı Dana Eti 200g, Soğan 100g, Domates Salçası 40g, Ayçiçek Yağı 30g, Su 1200g' },
    { name: 'Karnıyarık', kcal: 122, protein: 4.5, carbs: 4.8, fat: 9.7, kaynak: 'tarif', tarif: 'Patlıcan 600g, Kıyma (%15 yağlı) 250g, Soğan 120g, Domates 150g, Biber (yeşil sivri) 60g, Ayçiçek Yağı 60g, Su 200g' },
    { name: 'İmam Bayıldı', kcal: 107, protein: 1, carbs: 6.2, fat: 9.3, kaynak: 'tarif', tarif: 'Patlıcan 600g, Soğan 200g, Domates 200g, Sarımsak 20g, Zeytinyağı 100g, Su 150g' },
    { name: 'Menemen', kcal: 125, protein: 5.7, carbs: 3.6, fat: 10.2, kaynak: 'tarif', tarif: 'Yumurta (tam) 200g, Domates 300g, Biber (yeşil sivri) 100g, Ayçiçek Yağı 30g' },
    { name: 'Türlü', kcal: 69, protein: 1, carbs: 6.9, fat: 4.5, kaynak: 'tarif', tarif: 'Patlıcan 200g, Kabak (haşlanmış) 200g, Patates (haşlanmış) 200g, Biber (yeşil sivri) 100g, Domates 200g, Soğan 100g, Zeytinyağı 50g, Su 300g' },
    { name: 'Taze Fasulye Yemeği', kcal: 75, protein: 1.3, carbs: 5.4, fat: 5.9, kaynak: 'tarif', tarif: 'Yeşil Fasulye 600g, Soğan 100g, Domates 150g, Zeytinyağı 60g, Su 300g' },
    { name: 'Ispanak Yemeği', kcal: 78, protein: 2.7, carbs: 7.4, fat: 4.8, kaynak: 'tarif', tarif: 'Ispanak (çiğ) 700g, Soğan 100g, Pirinç (çiğ) 40g, Zeytinyağı 40g, Su 200g' },
    { name: 'Kıymalı Bezelye', kcal: 117, protein: 5.9, carbs: 8.8, fat: 6.6, kaynak: 'tarif', tarif: 'Bezelye 500g, Kıyma (%15 yağlı) 200g, Soğan 100g, Havuç 100g, Domates Salçası 30g, Ayçiçek Yağı 30g, Su 300g' },
    { name: 'Etli Patates Yemeği', kcal: 101, protein: 5, carbs: 10.4, fat: 4.5, kaynak: 'tarif', tarif: 'Patates (haşlanmış) 600g, Kuşbaşı Dana Eti 250g, Soğan 100g, Domates Salçası 30g, Ayçiçek Yağı 30g, Su 400g' },
    { name: 'Tavuk Sote', kcal: 148, protein: 19.8, carbs: 2.8, fat: 6.1, kaynak: 'tarif', tarif: 'Tavuk Göğsü (ızgara/haşlama) 500g, Biber (yeşil sivri) 150g, Domates 150g, Soğan 100g, Ayçiçek Yağı 30g' },
    { name: 'Izgara Köfte', kcal: 276, protein: 17.9, carbs: 6.1, fat: 19.5, kaynak: 'tarif', tarif: 'Kıyma (%15 yağlı) 500g, Soğan 80g, Ekmek (beyaz) 50g, Yumurta (tam) 50g, Maydanoz 20g' },
    { name: 'Tavuk Şiş', kcal: 212, protein: 30.4, carbs: 1.2, fat: 8.6, kaynak: 'tarif', tarif: 'Tavuk Göğsü (ızgara/haşlama) 600g, Yoğurt (sade, tam yağlı) 60g, Zeytinyağı 30g, Soğan 50g' },
    { name: 'Fırında Tavuk But', kcal: 227, protein: 25.9, carbs: 1.3, fat: 12.8, kaynak: 'tarif', tarif: 'Tavuk But (derisiz) 600g, Ayçiçek Yağı 20g, Soğan 80g' },
    { name: 'Mercimek Köftesi', kcal: 175, protein: 7.3, carbs: 27, fat: 4.7, kaynak: 'tarif', tarif: 'Kırmızı Mercimek (çiğ) 200g, Bulgur (çiğ) 150g, Soğan 100g, Domates Salçası 30g, Zeytinyağı 40g, Maydanoz 30g, Su 500g' },
    { name: 'Sucuklu Yumurta', kcal: 288, protein: 16.6, carbs: 1.5, fat: 24.2, kaynak: 'tarif', tarif: 'Sucuk 100g, Yumurta (tam) 150g, Ayçiçek Yağı 10g' },
    { name: 'Cacık', kcal: 54, protein: 2.2, carbs: 3.8, fat: 3.5, kaynak: 'tarif', tarif: 'Yoğurt (sade, tam yağlı) 500g, Salatalık 200g, Sarımsak 10g, Zeytinyağı 15g, Su 200g' },
    { name: 'Çoban Salata', kcal: 60, protein: 0.9, carbs: 4.5, fat: 4.7, kaynak: 'tarif', tarif: 'Domates 300g, Salatalık 200g, Soğan 80g, Maydanoz 30g, Zeytinyağı 30g, Limon Suyu 20g' },
    { name: 'Sütlaç', kcal: 118, protein: 3, carbs: 20.9, fat: 2.7, kaynak: 'tarif', tarif: 'Süt (tam yağlı) 1000g, Pirinç (çiğ) 80g, Toz Şeker 150g, Su 200g' }
  ]
};
