import { CLIENTES, RECETAS, generarCargas } from './semilla';
import { agruparEnVentas } from '@/lib/dominio/ventas';
import type { Carga } from './tipos';

/**
 * La consulta de la pantalla de Ventas — apartados 2 y 3, unificados.
 *
 * Antes eran dos: Cargas listaba pastones y Ventas listaba lo mismo
 * agrupado, así que las dos contestaban la misma pregunta con distinto
 * nivel de zoom. Ahora hay una sola pantalla: la venta es el renglón y
 * el pastón es su detalle → decisiones/hormigonera-la-venta-es-el-dia
 *
 * No hay pedido pendiente entre jornadas: se produce y se despacha el
 * mismo día. Una venta es lo que ya salió, no lo que se prometió.
 */
export async function traerVentas(ahora = new Date()) {
  const todas = generarCargas(ahora);

  /*
   * Los últimos treinta días, y NO el mes calendario.
   *
   * Con el mes en curso la pantalla queda vacía cada día 1: el primero
   * de septiembre mostraba cuatro ventas de las ciento veintisiete que
   * había. Una ventana que se corre siempre muestra lo mismo, cualquier
   * día que se entre.
   */
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - 30);
  const delPeriodo = todas.filter((c) => new Date(c.momento) >= desde);
  const hoy = ahora.toDateString();
  const delDia = todas.filter((c) => new Date(c.momento).toDateString() === hoy);

  /*
   * Lo que hay que hacer: pastones producidos que todavía no son de
   * nadie. Se muestran de HOY para atrás sin cortar por mes — una carga
   * del 31 sin asignar no puede desaparecer el día 1 (R4 del apartado 2).
   */
  const sinAsignar = todas.filter((c) => !c.clienteId && c.estado !== 'anulada');

  /**
   * El último precio que se le cobró a cada cliente, para proponerlo al
   * asignar. No es una lista de precios: es lo que pagó la última vez.
   * El número se congela en la venta igual → R2 del apartado 2.
   */
  const ultimoPrecio: Record<string, number> = {};
  for (const c of [...todas].sort((a, b) => a.momento.localeCompare(b.momento))) {
    if (c.clienteId && c.precioM3) ultimoPrecio[c.clienteId] = c.precioM3;
  }

  return {
    ahora,
    /** Desde cuándo se está contando. La pantalla tiene que decirlo. */
    desde: desde.toISOString(),
    ventas: agruparEnVentas(delPeriodo),
    sinAsignar: [...sinAsignar].reverse() as Carga[],
    /** El día, que es la unidad real de trabajo de la planta. */
    hoy: {
      cargas: delDia.filter((c) => c.estado !== 'anulada').length,
      m3: delDia.reduce((a, c) => a + (c.estado === 'anulada' ? 0 : c.m3), 0),
      total: delDia.reduce((a, c) => a + c.total, 0),
    },
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
    ultimoPrecio,
    /** En qué orden se le asigna color a cada receta. Fijo, nunca cíclico. */
    recetas: Object.keys(RECETAS),
  };
}

export type DatosVentas = Awaited<ReturnType<typeof traerVentas>>;
export type { Carga };
