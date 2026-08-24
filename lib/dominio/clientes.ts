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
 * Cuántos días hace que este cliente no compra.
 *
 * La pregunta de José no es "¿qué día compró?", es "¿hace cuánto que no
 * lo veo?". Una fecha obliga a restar contra el calendario; los días ya
 * son la respuesta. Devuelve null si nunca compró — que no es lo mismo
 * que hace mucho.
 */
export function diasSinComprar(ultimaCompra: string | null, ahora = new Date()): number | null {
  if (!ultimaCompra) return null;
  const dia = 24 * 60 * 60 * 1000;
  // Contra el arranque de cada día, no contra la hora: si no, una compra
  // de anoche da "0 días" y una de esta mañana también, pero una de ayer
  // a la tarde da 0 y una de ayer a la mañana da 1.
  const aMedianoche = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(
    0,
    Math.round((aMedianoche(ahora) - aMedianoche(new Date(ultimaCompra))) / dia),
  );
}

/**
 * Los umbrales del enfriamiento, en días.
 *
 * Existen para que el color signifique algo. Pintar de ámbar una compra
 * de hace tres días y de verde una de hace cinco inventa una alarma
 * donde no hay ninguna: los dos clientes están comprando. El color
 * aparece recién cuando alguien de verdad se está yendo.
 */
export const ENFRIAMIENTO = { tibio: 21, frio: 45 } as const;

export type Temperatura = 'fresco' | 'tibio' | 'frio';

export function temperatura(dias: number | null): Temperatura | null {
  if (dias === null) return null;
  if (dias >= ENFRIAMIENTO.frio) return 'frio';
  if (dias >= ENFRIAMIENTO.tibio) return 'tibio';
  return 'fresco';
}

/**
 * Qué porción de la planta es este cliente.
 *
 * No es lo mismo que compararlo contra el más grande. "Casi tanto como
 * el primero" no sirve para decidir nada; "el 19% de lo que sale de la
 * planta" dice cuánto se depende de él. Devuelve 0 si todavía no salió
 * nada, en vez de dividir por cero.
 */
export function participacion(m3: number, totalM3: number): number {
  if (totalM3 <= 0) return 0;
  return (m3 / totalM3) * 100;
}

/** Por qué se ordena el ranking. */
export type Criterio = 'volumen' | 'facturado';

/**
 * El ranking.
 *
 * Los dos criterios NO dan el mismo orden y esa es la razón de que se
 * pueda cambiar: un cliente que compra recetas caras factura más
 * llevando menos metros. Con la semilla de hoy, Corralón lleva un m³
 * menos que Constructora y deja casi trescientos mil pesos más.
 *
 * El genérico —la venta suelta— queda AFUERA. No es un cliente: es la
 * suma de todos los que no justificaron darlos de alta. Si un día
 * encabeza la lista, "mi cliente más importante" deja de significar
 * algo.
 */
export function ordenarRanking(
  clientes: ClienteConResumen[],
  criterio: Criterio,
): { ranking: ClienteConResumen[]; genericos: ClienteConResumen[] } {
  const valor = (c: ClienteConResumen) =>
    criterio === 'volumen' ? c.resumen.m3 : c.resumen.facturado;

  const ranking = clientes
    .filter((c) => !c.generico)
    .sort((a, b) => valor(b) - valor(a) || a.nombre.localeCompare(b.nombre, 'es'));

  return { ranking, genericos: clientes.filter((c) => c.generico) };
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
