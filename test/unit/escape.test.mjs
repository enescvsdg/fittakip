/* HTML kaçış yardımcıları — tarayıcı gerektirmeden, doğrudan app.js'ten okunur. */
import { appFonksiyonlari } from '../harness.mjs';

export default async function ({ rapor }) {
  const f = await appFonksiyonlari('escapeHtml', 'escapeHtmlLines', 'safeUrl');
  const e = (etiket, alinan, beklenen) => rapor.kontrol(etiket, alinan === beklenen, JSON.stringify(alinan));

  rapor.baslik('escapeHtml');
  e('script etiketi',       f.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  e('img onerror',          f.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  e('çift tırnakla kaçış',  f.escapeHtml('" onfocus="alert(1)'), '&quot; onfocus=&quot;alert(1)');
  e('tek tırnakla kaçış',   f.escapeHtml("' onfocus='alert(1)"), '&#39; onfocus=&#39;alert(1)');
  e('ve işareti',           f.escapeHtml('A & B'), 'A &amp; B');
  e('null',                 f.escapeHtml(null), '');
  e('undefined',            f.escapeHtml(undefined), '');
  e('sayı bozulmuyor',      f.escapeHtml(42), '42');
  e('normal metin',         f.escapeHtml('Omega 3'), 'Omega 3');

  rapor.baslik('escapeHtmlLines — önce kaçış, sonra satır sonu');
  e('satır sonu korunuyor', f.escapeHtmlLines('bir\niki'), 'bir<br>iki');
  e('etiket yine kaçıyor',  f.escapeHtmlLines('<b>\nx'), '&lt;b&gt;<br>x');
  e('eklenen br kaçmıyor',  f.escapeHtmlLines('a\nb').includes('<br>'), true);

  rapor.baslik('safeUrl');
  e('https geçiyor',        f.safeUrl('https://a.com/b?c=1'), 'https://a.com/b?c=1');
  e('http geçiyor',         f.safeUrl('http://a.com'), 'http://a.com');
  e('javascript: engelli',  f.safeUrl('javascript:alert(1)'), '');
  e('data: engelli',        f.safeUrl('data:text/html,<script>'), '');
  e('baştaki boşluk kandırmıyor', f.safeUrl('  javascript:alert(1)'), '');
  e('boş değer',            f.safeUrl(null), '');
  e('tırnak kaçıyor',       f.safeUrl('https://a.com/"x'), 'https://a.com/&quot;x');
}
