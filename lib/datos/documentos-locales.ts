'use client';

import {
  correlativoDe,
  formatearNumero,
  type Documento,
} from '@/lib/dominio/documentos';

/**
 * ⚠️ ANDAMIO DEL MVP — ESTO NO ES UNA BASE DE DATOS.
 *
 * Tercer hermano de `locales.ts` y `cargas-locales.ts`, y el que mas
 * incomoda de los tres, porque acá el andamio tiene una consecuencia que
 * los otros dos no tienen:
 *
 *   EL CORRELATIVO SE PUEDE REPETIR. El contador vive en el navegador.
 *   Si Fran emite el 0001-00000007 y Lau tambien, hay dos papeles
 *   distintos con el mismo numero y nadie se entera.
 *
 * Fran lo eligio sabiendo esto el 21/08: el numero propio se lee mejor
 * por telefono que un id de carga. Es aceptable mientras la app la toque
 * una persona sola en una demo. NO es aceptable en la planta.
 *
 * El dia que entre Supabase, el correlativo tiene que salir de una
 * secuencia de Postgres o de un `UPDATE ... RETURNING` sobre una fila de
 * contador — nunca de un `SELECT max()+1`, que tiene la misma carrera
 * que esto pero mas dificil de ver.
 */

const CLAVE = 'garrido:documentos-mvp';

/** Un solo punto de venta: hay una sola planta. */
const PUNTO_DE_VENTA = 1;

export function leerDocumentos(): Documento[] {
  if (typeof window === 'undefined') return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Documento[]) : [];
  } catch {
    return [];
  }
}

export function buscarDocumento(numero: string): Documento | null {
  return leerDocumentos().find((d) => d.numero === numero) ?? null;
}

/** El proximo numero libre, mirando el mayor correlativo ya emitido. */
export function proximoNumero(): string {
  const mayor = leerDocumentos().reduce((max, d) => Math.max(max, correlativoDe(d.numero)), 0);
  return formatearNumero(PUNTO_DE_VENTA, mayor + 1);
}

/**
 * Emite y guarda. Devuelve el documento con su numero ya puesto.
 *
 * El numero se asigna UNA vez, al emitir, y queda guardado. Si se
 * generara al imprimir, cada vez que alguien vuelve a abrir el mismo
 * remito saldria con un numero distinto — y dos papeles con el mismo
 * contenido y distinto numero es peor que no numerarlos.
 */
export function emitirDocumento(doc: Omit<Documento, 'numero' | 'emitido'>): Documento {
  const emitido: Documento = {
    ...doc,
    numero: proximoNumero(),
    emitido: new Date().toISOString(),
  };
  window.localStorage.setItem(CLAVE, JSON.stringify([...leerDocumentos(), emitido]));
  return emitido;
}

/** Los documentos ya emitidos de un cliente, del mas nuevo al mas viejo. */
export function documentosDe(clienteId: string): Documento[] {
  return leerDocumentos()
    .filter((d) => d.clienteId === clienteId)
    .sort((a, b) => b.emitido.localeCompare(a.emitido));
}
