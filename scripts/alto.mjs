/**
 * Cuánto scroll mide una pantalla en el teléfono, y en qué se va.
 *
 * Hermano de desborde.mjs: aquel mide a lo ancho, éste a lo largo. Una
 * captura dice "es larga"; esto dice cuál de los seis bloques se comió
 * seiscientos píxeles, que es lo único accionable.
 *
 * Uso, con la app corriendo:
 *   node scripts/alto.mjs /rentabilidad
 *   ANCHO=1440 node scripts/alto.mjs /cargas
 */
import { chromium } from 'playwright';
const ancho = Number(process.env.ANCHO ?? 390);
const ruta = process.argv[2] ?? '/rentabilidad';
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: ancho, height: 900 } });
await pag.goto(`http://localhost:3111${ruta}`, { waitUntil: 'networkidle' });
const r = await pag.evaluate(() => {
  const main = document.querySelector('main');
  const out = [];
  for (const el of main.children) {
    const c = el.getBoundingClientRect();
    const t = (el.querySelector('h1,h2,p')?.textContent || el.tagName).trim().slice(0, 48);
    out.push({ alto: Math.round(c.height), tag: el.tagName.toLowerCase(), que: t });
    for (const h of el.children) {
      if (el.children.length > 1 && h.getBoundingClientRect().height > 60) {
        const ht = (h.querySelector('h1,h2,p')?.textContent || h.tagName).trim().slice(0, 44);
        out.push({ alto: Math.round(h.getBoundingClientRect().height), tag: '  └ ' + h.tagName.toLowerCase(), que: ht });
      }
    }
  }
  return { total: document.documentElement.scrollHeight, bloques: out };
});
console.log(`TOTAL scrollHeight @${ancho}px = ${r.total}px`);
for (const b of r.bloques) console.log(String(b.alto).padStart(6) + '  ' + b.tag.padEnd(12) + ' ' + b.que);
await nav.close();
