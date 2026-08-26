import { CLIENTES, RECETAS, generarCargas, generarPedidos } from './semilla';
import type { Carga } from './tipos';

/**
 * La consulta de Cargas — el tronco.
 *
 * Devuelve las del día separadas por lo que hay que hacer con ellas: las
 * que esperan cliente arriba, el resto abajo. Es la única pantalla donde
 * una carga sin asignar es el sujeto y no una alerta.
 */
export async function traerCargas(ahora = new Date()) {
  // Las cargas llegan ya imputadas: el pedido es la unidad comercial y
  // el pastón la técnica → decisiones/hormigonera-el-pedido-es-la-venta
  const { todas, pedidos } = (() => {
    const g = generarPedidos(generarCargas(ahora));
    return { todas: g.cargas, pedidos: g.pedidos };
  })();

  const hoy = ahora.toDateString();
  const delDia = todas.filter((c) => new Date(c.momento).toDateString() === hoy);

  const sinCliente = delDia.filter((c) => !c.clienteId && c.estado !== 'anulada');
  const asignadas = delDia.filter((c) => c.clienteId);

  return {
    ahora,
    delDia: [...delDia].reverse() as Carga[],
    sinCliente: [...sinCliente].reverse() as Carga[],
    asignadas: asignadas.length,
    m3: delDia.reduce((a, c) => a + c.m3, 0),
    /** A quién SE PUEDE asignar: sólo los activos. */
    clientes: CLIENTES.filter((c) => c.activo).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      generico: c.generico ?? false,
    })),
    /**
     * Cómo se llama el que YA está asignado — todos, incluidos los dados
     * de baja. No es la misma lista: un cliente inactivo no aparece para
     * asignarle una carga nueva, pero sus ventas viejas siguen siendo
     * suyas y tienen que decir su nombre, no su código interno.
     */
    nombresDeCliente: Object.fromEntries(CLIENTES.map((c) => [c.id, c.nombre])),
    /** A qué pedido pertenece cada pastón, para poder mostrarlo. */
    pedidosPorId: Object.fromEntries(pedidos.map((p) => [p.id, p])),
    /** En qué orden se le asigna color a cada receta. Fijo, nunca cíclico. */
    recetas: Object.keys(RECETAS),
    /** Las últimas del historial, para ver más atrás sin salir. */
    recientes: [...todas.filter((c) => new Date(c.momento).toDateString() !== hoy)]
      .reverse()
      .slice(0, 12) as Carga[],
  };
}

export type DatosCargas = Awaited<ReturnType<typeof traerCargas>>;
