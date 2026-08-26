import type { Carga, Pedido } from '@/lib/datos/tipos';

/**
 * El pedido — la unidad comercial.
 *
 * Un pedido es lo que el cliente encargó; los pastones que el autómata
 * larga se le imputan encima. 18 m³ para Obras Monte SA son UN pedido y
 * tres pastones, no tres ventas.
 *
 * Nada de lo que se calcula acá está guardado: un acumulado en una
 * columna se desincroniza el día que alguien anula un pastón.
 * → decisiones/hormigonera-el-pedido-es-la-venta
 */

export interface AvanceDePedido {
  /** Los pastones que se le imputaron, del más nuevo al más viejo. */
  cargas: Carga[];
  /** Cuánto salió de verdad. Puede no coincidir con lo pedido. */
  producido: number;
  /** Cuánto falta. Cero si ya se cubrió o se pasó. */
  pendiente: number;
  /** Qué proporción del pedido salió, acotada a 100. */
  pct: number;
  /**
   * Lo que vale lo PRODUCIDO, al precio acordado.
   *
   * No se factura lo pedido: se factura lo que salió. Un pedido de 20 m³
   * del que salieron 18 vale por 18.
   */
  total: number;
}

/**
 * Cuánto se cubrió de un pedido.
 *
 * Las cargas anuladas no cuentan para el avance —el pedido sigue
 * necesitando ese volumen— pero sí consumieron material, y eso lo
 * descuenta Stock por su cuenta (R2 del apartado 7).
 */
export function avanceDe(pedido: Pedido, cargas: Carga[]): AvanceDePedido {
  const suyas = cargas
    .filter((c) => c.pedidoId === pedido.id && c.estado !== 'anulada')
    .sort((a, b) => b.momento.localeCompare(a.momento));

  const producido = suyas.reduce((a, c) => a + c.m3, 0);

  return {
    cargas: suyas,
    producido,
    pendiente: Math.max(pedido.m3 - producido, 0),
    pct: pedido.m3 > 0 ? Math.min((producido / pedido.m3) * 100, 100) : 0,
    total: Math.round(producido * pedido.precioM3),
  };
}

/**
 * Qué pedidos abiertos podrían recibir este pastón.
 *
 * Es el match, y hoy es una SUGERENCIA para que alguien confirme, no una
 * imputación automática: el registro que llega del autómata trae receta,
 * volumen y hora, pero NO trae cliente ni número de pedido. Con dos
 * pedidos de H-21 el mismo día, deducirlo sería adivinar.
 *
 * Si GENROD confirma que el HMI puede llevar el pedido, esto pasa a ser
 * directo y esta función se cae → clientes/hormigonera-jose/relevamiento-tecnico
 *
 * Se ordena por el que más cerca está de completarse: si a un pedido le
 * falta justo este pastón, es el candidato más probable.
 */
export function candidatosPara(
  carga: Carga,
  pedidos: Pedido[],
  cargas: Carga[],
): Pedido[] {
  return pedidos
    .filter((p) => p.estado === 'abierto' && p.receta === carga.receta)
    .map((p) => ({ p, falta: avanceDe(p, cargas).pendiente }))
    .filter(({ falta }) => falta > 0)
    .sort((a, b) => Math.abs(a.falta - carga.m3) - Math.abs(b.falta - carga.m3))
    .map(({ p }) => p);
}

/**
 * El estado que le corresponde a un pedido según lo producido.
 *
 * Se deriva, no se guarda: si se guardara, un pastón anulado dejaría el
 * pedido en "completo" para siempre.
 */
export function estadoDe(pedido: Pedido, cargas: Carga[]): Pedido['estado'] {
  if (pedido.estado === 'cancelado') return 'cancelado';
  return avanceDe(pedido, cargas).pendiente === 0 ? 'completo' : 'abierto';
}

/** El buscador: por número de pedido, cliente o receta. Sin acentos. */
export function coincidePedido(
  pedido: Pedido,
  nombreCliente: string | null,
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

  return [pedido.id, pedido.receta, nombreCliente, pedido.obra]
    .filter((v): v is string => Boolean(v))
    .some((v) => limpiar(v).includes(q));
}
