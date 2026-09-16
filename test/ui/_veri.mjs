/* Arayüz testlerinin paylaştığı örnek veriler. Tek yerde durmaları,
   veri modeli değiştiğinde yedi takımı ayrı ayrı güncellemeyi önlüyor. */
import { bugunAnahtari, TR_GUNLER } from '../harness.mjs';

export const BUGUN = bugunAnahtari();
export const BUGUN_ADI = TR_GUNLER[new Date().getDay()];

export const gunOnce = n => {
  const d = new Date(); d.setDate(d.getDate() - n); return bugunAnahtari(d);
};

export const hareket = (ad, set, tekrar) => ({
  name: ad, sets: set, reps: tekrar, weight: '', checked: new Array(set).fill(false)
});

export const gida = (ad, gram, kcal, p, k, y) => ({
  id: 'f' + Math.random().toString(36).slice(2), name: ad, grams: gram,
  kcal100: 0, protein100: 0, carbs100: 0, fat100: 0,
  kcal, protein: p, carbs: k, fat: y, isEstimated: false
});

export const takviye = (id, ad, doz, saat) => ({ id, name: ad, dose: doz, note: '', reminder: saat });

/* Dolu bir profil: ölçüler, tartım geçmişi, bugüne ait antrenman,
   beslenme planı ve saatli supplementler. */
export const DOLU = {
  ft_height: '178', ft_weight: '75.4', ft_goal_weight: '70', ft_age: '29', ft_gender: 'male',
  ft_weighins: JSON.stringify([
    { date: gunOnce(72), weight: 79.1 }, { date: gunOnce(44), weight: 77.2 },
    { date: gunOnce(16), weight: 75.9 }, { date: gunOnce(2),  weight: 75.4 }
  ]),
  ft_workout_days_v2: JSON.stringify({
    [BUGUN_ADI]: {
      title: 'Push Günü',
      exercises: [hareket('Bench Press', 4, '8-10'), hareket('Incline DB Press', 3, '10'), hareket('Lateral Raise', 3, '12-15')],
      postWorkout: []
    }
  }),
  ft_workout_history: JSON.stringify([1, 2, 3, 5, 6, 8].map(n => ({
    date: gunOnce(n), weekday: TR_GUNLER[new Date(gunOnce(n)).getDay()],
    exercises: [{ name: 'Bench Press', sets: [{ weight: 60, reps: 8 }, { weight: 65, reps: 8 }] }]
  }))),
  ft_meal_plan: JSON.stringify({
    'Öğün 1': [gida('Yumurta', 150, 215, 19, 1, 15), gida('Yulaf', 80, 304, 10, 54, 6)],
    'Öğün 2': [gida('Tavuk göğsü', 200, 330, 62, 0, 7)]
  }),
  ft_supplement_plan: JSON.stringify({
    'Sabah': [takviye('s1', 'Omega 3', '2 kapsül', '08:00'), takviye('s2', 'D Vitamini', '1 damla', '08:00')],
    'Antrenman Öncesi': [takviye('s3', 'Kreatin', '5 g', '17:30')]
  })
};

/* Yalnızca supplement planı — kart ve işaretleme testleri için */
export const supplementPlani = (liste) => JSON.stringify(liste);
