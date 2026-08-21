'use client';

import type { Carga } from './tipos';

/**
 * ⚠️ ANDAMIO DEL MVP — ESTO NO ES UNA BASE DE DATOS.
 *
 * Hermano de `locales.ts`, con la misma advertencia y las mismas
 * limitaciones: lo que se asigna acá queda en el navegador de quien lo
 * asignó. No se comparte con Lau, no sobrevive a otro navegador, y no
 * hay concurrencia.
 *
 * La diferencia con Clientes es que acá el andamio se nota más, porque
 * Inicio se renderiza en el servidor: la asignación tiene que aplicarse
 * en un segundo pase, del lado del navegador, o `router.refresh()` la
 * pisa con lo que dice la semilla.
 *
 * El día que entre Supabase esto se borra entero y la asignación pasa a
 * ser un `update` en una server action. Lo que NO cambia es la regla:
 * el precio se congela en el momento de asignar.
 */

const CLAVE = 'garrido:asignaciones-mvp';

export interface AsignacionLocal {
  clienteId: string;
  /** El precio que se congelo al asignar. No se recalcula nunca. */
  total: number;
  /** Cuando se asigno, para poder auditar el andamio si algo no cierra. */
  momento: string;
}

export type Asignaciones = Record<string, AsignacionLocal>;

export function leerAsignaciones(): Asignaciones {
  if (typeof window === 'undefined') return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Asignaciones) : {};
  } catch {
    // Un localStorage corrupto no puede tumbar la pantalla entera.
    return {};
  }
}

export function asignarLocal(cargaId: string, clienteId: string, total: number) {
  const actual = leerAsignaciones();
  const proximo: Asignaciones = {
    ...actual,
    [cargaId]: { clienteId, total, momento: new Date().toISOString() },
  };
  window.localStorage.setItem(CLAVE, JSON.stringify(proximo));
}

export function desasignarLocal(cargaId: string) {
  const actual = leerAsignaciones();
  delete actual[cargaId];
  window.localStorage.setItem(CLAVE, JSON.stringify(actual));
}

/**
 * Aplica las asignaciones locales sobre las cargas que vinieron del
 * servidor.
 *
 * `montoFacturado` queda en null a proposito. Asignar un cliente y
 * decidir cuanto de esa venta se factura son dos momentos distintos: al
 * salir el paston Jose sabe para quien es, no necesariamente que va a
 * pasar con el papel. Afirmar "negro" ahi seria inventarle una decision.
 */
export function aplicarAsignaciones(cargas: Carga[], asignaciones: Asignaciones): Carga[] {
  if (Object.keys(asignaciones).length === 0) return cargas;

  return cargas.map((c) => {
    const a = asignaciones[c.id];
    if (!a || c.clienteId) return c;
    return { ...c, clienteId: a.clienteId, total: a.total, estado: 'asignada' as const };
  });
}
