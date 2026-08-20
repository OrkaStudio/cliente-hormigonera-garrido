/**
 * Chequeo de desborde horizontal.
 *
 * El sistema de diseño pide que ninguna pantalla se corra al costado en
 * el teléfono, y una captura no alcanza para verificarlo: el headless de
 * Chrome por línea de comandos no siempre fija el viewport que se le
 * pide, así que muestra recortes que no existen y esconde los que sí.
 * Esto mide el DOM y además dice qué elemento lo causa.
 *
 * Uso, con la app corriendo:
 *   npm run desborde -- /clientes /clientes/CL-01 /
 */
import { chromium } from 'playwright';

const rutas = process.argv.slice(2);
if (rutas.length === 0) {
  console.error('Pasá al menos una ruta. Ej: npm run desborde -- / /clientes');
  process.exit(1);
}

const base = process.env.URL_BASE ?? 'http://localhost:3111';
const ancho = Number(process.env.ANCHO ?? 390);

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: ancho, height: 900 } });
let fallo = false;

for (const ruta of rutas) {
  await pag.goto(`${base}${ruta}`, { waitUntil: 'networkidle' });

  const r = await pag.evaluate(() => {
    const limite = document.documentElement.clientWidth;
    const culpables = [];
    for (const el of document.querySelectorAll('body *')) {
      const c = el.getBoundingClientRect();
      if (c.right > limite + 1 || c.left < -1) {
        culpables.push({
          tag: el.tagName.toLowerCase(),
          clase: (el.getAttribute('class') || '').slice(0, 70),
          derecha: Math.round(c.right),
        });
      }
    }
    return { limite, scroll: document.documentElement.scrollWidth, culpables };
  });

  const desborda = r.scroll > r.limite + 1;
  fallo ||= desborda;

  console.log(
    `${desborda ? '❌' : '✅'} ${ruta}  viewport=${r.limite}  scrollWidth=${r.scroll}`,
  );
  // Los primeros nomás: los hijos heredan el desborde del padre.
  for (const c of r.culpables.slice(0, 5)) {
    console.log(`     ${c.tag}.${c.clase}  derecha=${c.derecha}`);
  }
}

await nav.close();
process.exit(fallo ? 1 : 0);
