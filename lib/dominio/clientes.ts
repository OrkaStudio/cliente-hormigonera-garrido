import type { Carga, Cliente } from '@/lib/datos/tipos';
import { pesosDe } from './fiscal';

/**
 * Lo que se sabe de un cliente mirando sus cargas.
 *
 * Nada de esto se guarda: se calcula. Un total acumulado en una columna
 * se desincroniza el día que alguien anula una carga vieja, y nadie se
 * entera hasta que los números no cierran.
 */
export interface ResumenCliente {
  ventas: number;
  m3: number;
  facturado: number;
  ultimaCompra: string | null;
  /** La receta que más veces compró. Null si todavía no compró nada. */
  recetaFrecuente: string | null;
  /**
   * Blanco y negro se miden EN PESOS, no en cantidad de ventas.
   *
   * Contar ventas hacía que una de $6.000.000 pesara lo mismo que una
   * de $500.000, y con facturación parcial deja de tener sentido: una
   * misma venta cae de los dos lados a la vez. R5 del apartado 3 pide
   * los dos totales separados, y separados quiere decir en plata.
   */
  blanco: number;
  negro: number;
  /** Cuántas ventas ya tienen el corte definido. Para el texto al pie. */
  definidas: number;
}

/**
 * R3 — el resumen se calcula sobre ventas asignadas, no sobre cargas
 * registradas: una carga sin cliente no le suma a nadie.
 *
 * Las anuladas tampoco cuentan. Una carga que se abortó a mitad no es
 * una venta, y sumarla infla los m³ de alguien que nunca los recibió.
 */
export function ventasDe(clienteId: string, cargas: Carga[]): Carga[] {
  return cargas.filter((c) => c.clienteId === clienteId && c.estado !== 'anulada');
}

export function resumenDeCliente(clienteId: string, cargas: Carga[]): ResumenCliente {
  const ventas = ventasDe(clienteId, cargas);

  const porReceta = new Map<string, number>();
  for (const v of ventas) {
    porReceta.set(v.receta, (porReceta.get(v.receta) ?? 0) + 1);
  }

  // Empate: gana la que viene primero por orden alfabético, para que el
  // resultado no dependa del orden en que llegaron las cargas.
  const recetaFrecuente =
    [...porReceta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  const momentos = ventas.map((v) => v.momento).sort();

  // Las que no tienen el corte definido quedan afuera de los dos lados.
  const cortes = ventas.map(pesosDe).filter((p) => p !== null);

  return {
    ventas: ventas.length,
    m3: ventas.reduce((a, v) => a + v.m3, 0),
    facturado: ventas.reduce((a, v) => a + v.total, 0),
    ultimaCompra: momentos.at(-1) ?? null,
    recetaFrecuente,
    blanco: cortes.reduce((a, p) => a + p.blanco, 0),
    negro: cortes.reduce((a, p) => a + p.negro, 0),
    definidas: cortes.length,
  };
}

/**
 * Qué porcentaje de la plata va en blanco, sobre lo que tiene el corte
 * definido.
 *
 * El denominador excluye las ventas sin definir a propósito: si una
 * venta todavía no se definió, contarla como negro es afirmar algo que
 * nadie dijo. Devuelve null cuando no hay ninguna definida — no 0%, que
 * se leería como "le vende todo en negro".
 */
export function porcentajeEnBlanco(resumen: ResumenCliente): number | null {
  const pesos = resumen.blanco + resumen.negro;
  if (pesos === 0) return null;
  return Math.round((resumen.blanco / pesos) * 100);
}

export interface ClienteConResumen extends Cliente {
  resumen: ResumenCliente;
}

/**
 * El orden de la lista: primero el que compró más recientemente.
 *
 * Es el orden que sirve para trabajar. Alfabético obliga a buscar a
 * alguien que ya sabés quién es; por facturación pone arriba a un
 * cliente que no compra hace ocho meses.
 */
export function ordenarPorActividad(clientes: ClienteConResumen[]): ClienteConResumen[] {
  return [...clientes].sort((a, b) => {
    const fa = a.resumen.ultimaCompra ?? '';
    const fb = b.resumen.ultimaCompra ?? '';
    if (fa !== fb) return fb.localeCompare(fa);
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * El buscador. Compara sin acentos y sin distinguir mayúsculas, porque
 * nadie va a tipear "Corralón" con tilde para encontrar el corralón.
 */
export function coincide(cliente: Cliente, busqueda: string): boolean {
  const limpiar = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const q = limpiar(busqueda);
  if (!q) return true;

  return [cliente.nombre, cliente.contacto, cliente.cuit, cliente.direccion]
    .filter((v): v is string => Boolean(v))
    .some((v) => limpiar(v).includes(q));
}
