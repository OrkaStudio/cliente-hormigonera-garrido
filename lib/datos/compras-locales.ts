'use client';

import type { Compra } from '@/lib/datos/tipos';

/**
 * ⚠️ ANDAMIO DEL MVP — vive en el navegador, como sus hermanos
 * (`cargas-locales`, `ajustes-locales`, `documentos-locales`).
 *
 * Una compra cargada acá sube el stock en el momento, que es el criterio
 * de terminado del apartado 6: "la compra impacta el stock en el
 * momento". Cuando exista Supabase, esto se reemplaza por un insert y la
 * deducción se recalcula sola en el servidor.
 */

const CLAVE = 'garrido:compras-mvp';

export function leerCompras(): Compra[] {
  if (typeof window === 'undefined') return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Compra[]) : [];
  } catch {
    return [];
  }
}

export function registrarCompra(
  compra: Omit<Compra, 'id' | 'momento'> & { momento?: string },
): Compra[] {
  const todas = [
    ...leerCompras(),
    {
      ...compra,
      id: `CP-${Date.now().toString(36).toUpperCase()}`,
      momento: compra.momento ?? new Date().toISOString(),
    },
  ];
  window.localStorage.setItem(CLAVE, JSON.stringify(todas));
  return todas;
}

/** Cuánto entró de un material por esta vía, en unidad de planta. */
export function entradasLocales(material: string, compras: Compra[]): number {
  return compras
    .filter((c) => c.material === material && !c.anulada)
    .reduce((a, c) => a + c.cantidadConvertida, 0);
}
