'use client';

import type { CostoFijo } from '@/lib/dominio/rentabilidad';

/**
 * ⚠️ ANDAMIO DEL MVP — vive en el navegador, como sus hermanos.
 *
 * Los costos fijos los carga José y son de él: sueldos, combustible,
 * alquiler, la cuota del mixer. La spec del apartado 8 es explícita en
 * que esto NO viene por default —"se decide con él"— así que arranca
 * vacío a propósito. Un margen que ya trae costos que nadie cargó es
 * exactamente el número que hace que José deje de creerle al sistema.
 */

const CLAVE = 'garrido:costos-fijos-mvp';

export function leerCostosFijos(): CostoFijo[] {
  if (typeof window === 'undefined') return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as CostoFijo[]) : [];
  } catch {
    return [];
  }
}

function guardar(fijos: CostoFijo[]) {
  window.localStorage.setItem(CLAVE, JSON.stringify(fijos));
}

export function agregarCostoFijo(nombre: string, mensual: number): CostoFijo[] {
  const fijos = leerCostosFijos();
  const nuevo: CostoFijo = {
    id: `CF-${Date.now().toString(36)}`,
    nombre: nombre.trim(),
    mensual,
  };
  const todos = [...fijos, nuevo];
  guardar(todos);
  return todos;
}

export function quitarCostoFijo(id: string): CostoFijo[] {
  const todos = leerCostosFijos().filter((f) => f.id !== id);
  guardar(todos);
  return todos;
}
