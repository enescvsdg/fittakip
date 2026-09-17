/* "Aldım" kutucuğu, günlük sıfırlanma ve bildirimden ilgili satıra gitme. */
import { sayfaAc, SABIT_TARIH } from '../harness.mjs';
import { takviye } from './_veri.mjs';

const PLAN = {
  'Sabah': [takviye('s1', 'Omega 3', '2 kapsül', '08:00'), takviye('s2', 'D Vitamini', '1 damla', '08:00')],
  'Antrenman Öncesi': [takviye('s3', 'Kreatin', '5 g', '17:30')],
  'Akşam / Yatmadan Önce': [takviye('s4', 'Magnezyum', '1 tablet', '23:00')]
};
const VERI = { ft_height: '178', ft_weight: '75.4', ft_supplement_plan: JSON.stringify(PLAN) };
const BUGUN = SABIT_TARIH;

export default async function ({ rapor, adres, browser }) {
  let { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: VERI, zamanSabit: true });
  const depo = () => page.evaluate(() => JSON.parse(localStorage.getItem('ft_supp_taken') || '{}'));

  await page.evaluate(() => { showPage('supplement'); renderSupplementPlanView(); });
  await page.waitForTimeout(300);

  rapor.baslik('kutucuk');
  rapor.kontrol('Her takviyede bir kutucuk var', await page.locator('.supp-take-btn').count() === 4);

  await page.locator('.supp-row[data-supp-id="s1"] .supp-take-btn').click();
  await page.waitForTimeout(250);
  rapor.kontrol('İşaretlenen kutucuk basılı görünüyor',
    await page.getAttribute('.supp-row[data-supp-id="s1"] .supp-take-btn', 'aria-pressed') === 'true');
  rapor.kontrol('Satır "alındı" görünümüne geçti',
    await page.locator('.supp-row[data-supp-id="s1"]').evaluate(el => el.classList.contains('taken')));
  rapor.kontrol('Diğer satırlar etkilenmedi',
    await page.getAttribute('.supp-row[data-supp-id="s2"] .supp-take-btn', 'aria-pressed') === 'false');
  rapor.kontrol('Depoya bugünün tarihiyle yazıldı', (await depo()).s1 === BUGUN, JSON.stringify(await depo()));

  await page.locator('.supp-row[data-supp-id="s1"] .supp-take-btn').click();
  await page.waitForTimeout(250);
  rapor.kontrol('Tekrar dokununca işaret kalkıyor', (await depo()).s1 === undefined);

  rapor.baslik('sunucuya gidecek veri');
  await page.evaluate(() => setSuppTaken('s3', true));
  const govde = await page.evaluate(() => ({ taken: getSuppTaken(), sayi: collectReminders().length }));
  rapor.kontrol('"aldım" haritası doğru', govde.taken.s3 === BUGUN, JSON.stringify(govde.taken));

  rapor.baslik('kalıcılık ve temizlik');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1100);
  await page.evaluate(() => { showPage('supplement'); renderSupplementPlanView(); });
  await page.waitForTimeout(250);
  rapor.kontrol('Yenilemeden sonra işaret duruyor',
    await page.getAttribute('.supp-row[data-supp-id="s3"] .supp-take-btn', 'aria-pressed') === 'true');

  await page.evaluate(() => {
    const plan = getSupplementPlan(); plan['Antrenman Öncesi'] = []; saveSupplementPlan(plan);
  });
  await page.waitForTimeout(200);
  rapor.kontrol('Silinen takviyenin işareti temizlendi', (await depo()).s3 === undefined, JSON.stringify(await depo()));

  rapor.baslik('bildirimden gelme — uygulama açıkken');
  await page.evaluate(() => showPage('home'));
  await page.waitForTimeout(220);
  await page.evaluate(() => openSupplementFromNotification('s4'));
  await page.waitForTimeout(450);
  rapor.kontrol('Supplement sayfası açıldı', await page.isVisible('#page-supplement'));
  rapor.kontrol('İlgili satır vurgulandı',
    await page.locator('.supp-row[data-supp-id="s4"]').evaluate(el => el.classList.contains('flash')));
  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();

  rapor.baslik('bildirimden gelme — uygulama kapalıyken');
  ({ ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: VERI, zamanSabit: true, yol: '/index.html?supp=s2' }));
  await page.waitForTimeout(500);
  rapor.kontrol('Adresle açılınca supplement sayfası geldi', await page.isVisible('#page-supplement'));
  rapor.kontrol('Adresle gelen satır vurgulandı',
    await page.locator('.supp-row[data-supp-id="s2"]').evaluate(el => el.classList.contains('flash')));
  await page.waitForTimeout(5200);
  rapor.kontrol('Adres çubuğu sonradan temizlendi', !(await page.evaluate(() => location.search)));
  rapor.kontrol('Konsol hatası yok (adres yolu)', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
