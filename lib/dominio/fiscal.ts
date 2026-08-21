import type { Carga, Fiscal } from '@/lib/datos/tipos';

/** Lo minimo que hace falta para saber de que lado cae una venta. */
type Corte = Pick<Carga, 'total' | 'montoFacturado'>;

/**
 * De que lado cae una venta, derivado del monto facturado.
 *
 * Devuelve null cuando no hay nada que afirmar: si la venta todavia no
 * tiene el corte definido, o si no tiene precio. Decir "negro" en esos
 * casos seria afirmar algo que nadie dijo — el mismo criterio que ya
 * usaba `porcentajeEnBlanco` para el denominador.
 */
export function condicionFiscal(venta: Corte): Fiscal | null {
  const { total, montoFacturado } = venta;

  if (montoFacturado === null) return null;
  // Sin precio no hay corte fiscal. Una carga sin cliente vale 0 y no
  // es ni blanca ni negra: es una carga que todavia no es una venta.
  if (total <= 0) return null;

  if (montoFacturado <= 0) return 'negro';
  if (montoFacturado >= total) return 'blanco';
  return 'parcial';
}

/**
 * Que porcentaje del total se facturo. Redondeado, acotado a 0-100.
 *
 * Es para MOSTRAR, no para guardar: lo que persiste es el monto.
 */
export function porcentajeFacturado(venta: Corte): number | null {
  const { total, montoFacturado } = venta;
  if (montoFacturado === null || total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((montoFacturado / total) * 100)));
}

/**
 * Los pesos de una venta partidos en blanco y negro.
 *
 * `montoFacturado` se acota contra el total: si alguien cargo un monto
 * mayor que la venta, el excedente no se inventa como facturacion ni
 * hace que el negro de negativo. Se marca, no se rechaza.
 */
export function pesosDe(venta: Corte): { blanco: number; negro: number } | null {
  if (condicionFiscal(venta) === null) return null;
  const blanco = Math.min(Math.max(venta.montoFacturado ?? 0, 0), venta.total);
  return { blanco, negro: venta.total - blanco };
}
