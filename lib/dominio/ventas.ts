import type { Carga } from '@/lib/datos/tipos';
import type { Documento } from './documentos';

/**
 * El apartado 3 — ventas y documentos.
 *
 * El resumen y el agrupado por día salen de `dominio/cargas`: una venta
 * ES una carga con cliente y precio, así que no hay dos formas de
 * sumarlas. Acá vive sólo lo que es propio de este apartado.
 */

/** Qué papel le corresponde a cada venta, cruzado por el id de la carga. */
export function documentoDe(cargaId: string, documentos: Documento[]): Documento | null {
  return documentos.find((d) => d.cargaId === cargaId) ?? null;
}

/**
 * El buscador.
 *
 * Busca por número de carga, receta, cliente y número de documento. Sin
 * acentos, sin mayúsculas y sin guiones: nadie tipea "0001-00000042"
 * completo ni "Corralón" con tilde.
 */
export function coincideVenta(
  venta: Carga,
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

  return [venta.id, venta.receta, nombreCliente, documento?.numero]
    .filter((v): v is string => Boolean(v))
    .some((v) => limpiar(v).includes(q));
}
