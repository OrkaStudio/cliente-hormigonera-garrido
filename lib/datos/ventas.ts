import { CLIENTES, generarCargas, generarPedidos } from './semilla';
import { avanceDe, estadoDe } from '@/lib/dominio/pedidos';
import type { Carga, Pedido } from './tipos';

/**
 * Las consultas de Ventas — apartado 3.
 *
 * Una VENTA es un PEDIDO, no un pastón. 18 m³ para un cliente son un
 * pedido y tres pastones; antes la pantalla mostraba tres ventas y había
 * que tipearle el precio a cada una
 * → decisiones/hormigonera-el-pedido-es-la-venta
 */

export interface PedidoConAvance extends Pedido {
  clienteNombre: string;
  /** El estado se deriva de lo producido: guardarlo lo desincroniza. */
  estadoReal: Pedido['estado'];
  avance: ReturnType<typeof avanceDe>;
}

export async function traerVentas(ahora = new Date()) {
  const { pedidos, cargas } = generarPedidos(generarCargas(ahora));

  /*
   * El mes en curso. Sin el corte son cien y pico de días de historia, y
   * el mes es además el período del corte blanco/negro — lo que se mira
   * para decidir, no el acumulado desde que arrancó la planta.
   */
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const nombres = Object.fromEntries(CLIENTES.map((c) => [c.id, c.nombre]));

  const delMes: PedidoConAvance[] = pedidos
    .filter((p) => new Date(p.creado) >= desde)
    .map((p) => ({
      ...p,
      clienteNombre: nombres[p.clienteId] ?? p.clienteId,
      estadoReal: estadoDe(p, cargas),
      avance: avanceDe(p, cargas),
    }))
    .sort((a, b) => b.creado.localeCompare(a.creado));

  return {
    ahora,
    /** Desde cuándo se está contando. La pantalla tiene que decirlo. */
    desde: desde.toISOString(),
    pedidos: delMes,
    /**
     * Pastones producidos que nadie imputó a un pedido. No son ventas
     * todavía, pero son la razón por la que el total de acá no cuadra
     * con la producción.
     */
    sinImputar: cargas.filter(
      (c) => !c.pedidoId && c.estado !== 'anulada' && new Date(c.momento) >= desde,
    ).length,
    nombresDeCliente: nombres,
  };
}

export type DatosVentas = Awaited<ReturnType<typeof traerVentas>>;
export type { Carga };
