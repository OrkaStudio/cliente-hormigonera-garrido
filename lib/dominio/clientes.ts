import type { Carga, Cliente } from '@/lib/datos/tipos';

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
  blanco: number;
  negro: number;
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

  return {
    ventas: ventas.length,
    m3: ventas.reduce((a, v) => a + v.m3, 0),
    facturado: ventas.reduce((a, v) => a + v.total, 0),
    ultimaCompra: momentos.at(-1) ?? null,
    recetaFrecuente,
    blanco: ventas.filter((v) => v.fiscal === 'blanco').length,
    negro: ventas.filter((v) => v.fiscal === 'negro').length,
  };
}

/**
 * El porcentaje en blanco sobre lo que tiene marca fiscal.
 *
 * El denominador excluye las ventas sin marcar a propósito: si una venta
 * todavía no se definió, contarla como negro es afirmar algo que nadie
 * dijo. Devuelve null cuando no hay ninguna marcada — no 0%, que se
 * leería como "le vende todo en negro".
 */
export function porcentajeEnBlanco(resumen: ResumenCliente): number | null {
  const marcadas = resumen.blanco + resumen.negro;
  if (marcadas === 0) return null;
  return Math.round((resumen.blanco / marcadas) * 100);
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
