import type { Carga } from '@/lib/datos/tipos';
import type { Documento } from './documentos';
import { pesosDe } from './fiscal';

/**
 * La venta — apartados 2 y 3, unificados.
 *
 * Una venta es el conjunto de pastones que salieron para el MISMO
 * cliente, con la MISMA receta, el MISMO día. No es un pedido tomado por
 * anticipado: es una agrupación de lo que ya pasó.
 *
 * Se produce y se despacha en el día, así que no existe el caso de una
 * venta que queda a medias entre jornadas. Por eso acá no hay "pendiente"
 * ni "abierto": inventarlos sería afirmar un flujo que nadie describió
 * → decisiones/hormigonera-el-pedido-es-la-venta
 *
 * Nada de esto se guarda. Se deriva de las cargas, que es lo único que
 * el autómata escribe.
 */

export interface Venta {
  /** El día, el cliente y la receta: lo que define el grupo. */
  id: string;
  dia: string;
  momento: string;
  clienteId: string;
  receta: string;
  /** Los pastones que la componen, del más nuevo al más viejo. */
  cargas: Carga[];
  m3: number;
  total: number;
  /** Los pesos partidos, sobre lo que tiene el corte definido. */
  blanco: number;
  negro: number;
  /** Qué porcentaje se facturó, o null si nada tiene el corte definido. */
  pctBlanco: number | null;
}

/** El día calendario local. Cortar el ISO da UTC y corre las de la noche. */
function diaLocal(momento: string): string {
  const d = new Date(momento);
  const dd = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

/**
 * Agrupa los pastones en ventas.
 *
 * Las cargas sin cliente NO entran: todavía no son de nadie. Las
 * anuladas tampoco — no se vendieron, aunque hayan consumido material.
 */
export function agruparEnVentas(cargas: Carga[]): Venta[] {
  const grupos = new Map<string, Carga[]>();

  for (const c of cargas) {
    if (!c.clienteId || c.estado === 'anulada') continue;
    const clave = `${diaLocal(c.momento)}|${c.clienteId}|${c.receta}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), c]);
  }

  return [...grupos.entries()]
    .map(([clave, suyas]) => {
      const ordenadas = [...suyas].sort((a, b) => b.momento.localeCompare(a.momento));
      const cortes = ordenadas.map(pesosDe).filter((p) => p !== null);
      const blanco = cortes.reduce((a, p) => a + p.blanco, 0);
      const negro = cortes.reduce((a, p) => a + p.negro, 0);
      const definido = blanco + negro;

      return {
        id: clave,
        dia: clave.split('|')[0]!,
        momento: ordenadas[0]!.momento,
        clienteId: ordenadas[0]!.clienteId!,
        receta: ordenadas[0]!.receta,
        cargas: ordenadas,
        m3: ordenadas.reduce((a, c) => a + c.m3, 0),
        total: ordenadas.reduce((a, c) => a + c.total, 0),
        blanco,
        negro,
        pctBlanco: definido > 0 ? (blanco / definido) * 100 : null,
      };
    })
    .sort((a, b) => b.momento.localeCompare(a.momento));
}

/** El papel de una venta, cruzado por cualquiera de sus pastones. */
export function documentoDe(venta: Venta, documentos: Documento[]): Documento | null {
  const ids = new Set(venta.cargas.map((c) => c.id));
  return documentos.find((d) => d.cargaId && ids.has(d.cargaId)) ?? null;
}

/** El buscador: por cliente, receta, número de carga o de documento. */
export function coincideVenta(
  venta: Venta,
  nombreCliente: string | null,
  documento: Documento | null,
  busqueda: string,
): boolean {
  const limpiar = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[\s-]/g, '');

  const q = limpiar(busqueda);
  if (!q) return true;

  return [
    nombreCliente,
    venta.receta,
    documento?.numero,
    ...venta.cargas.map((c) => c.id),
  ]
    .filter((v): v is string => Boolean(v))
    .some((v) => limpiar(v).includes(q));
}
