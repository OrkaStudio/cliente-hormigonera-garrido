'use client';

import type { AjusteStock } from '@/lib/dominio/stock';

/**
 * ⚠️ ANDAMIO DEL MVP — vive en el navegador, como sus hermanos.
 *
 * Cada vez que alguien mira los silos y declara lo que hay, queda un
 * ajuste con fecha. R3: es un ajuste, no un borrón — el histórico no se
 * pisa, porque de la serie de ajustes sale la merma medida de la planta.
 */

const CLAVE = 'garrido:ajustes-stock-mvp';

export function leerAjustes(): AjusteStock[] {
  if (typeof window === 'undefined') return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as AjusteStock[]) : [];
  } catch {
    return [];
  }
}

export function registrarAjuste(
  material: string,
  declarado: number,
  calculado: number,
  motivo?: string,
): AjusteStock[] {
  const todos = [
    ...leerAjustes(),
    {
      id: `AJ-${Date.now().toString(36)}`,
      material,
      fecha: new Date().toISOString(),
      declarado,
      calculado,
      ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
    },
  ];
  window.localStorage.setItem(CLAVE, JSON.stringify(todos));
  return todos;
}

/** Lo último que se declaró de un material, si se declaró algo. */
export function ultimoAjuste(material: string, ajustes: AjusteStock[]): AjusteStock | null {
  const suyos = ajustes
    .filter((a) => a.material === material)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return suyos[0] ?? null;
}
