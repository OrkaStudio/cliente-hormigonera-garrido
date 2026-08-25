import { CLIENTES, generarCargas } from './semilla';
import type { Carga } from './tipos';

/**
 * Las consultas de Ventas — apartado 3.
 *
 * Una VENTA es una carga que ya tiene cliente y precio. Las que todavía
 * no lo tienen viven en Cargas y no entran acá: no son ventas, son
 * hormigón que salió y nadie imputó.
 *
 * Las anuladas tampoco. Consumieron material —eso lo cuenta Stock— pero
 * no facturaron nada.
 */
export async function traerVentas(ahora = new Date()) {
  const todas = generarCargas(ahora);

  /*
   * El mes en curso, no todo el histórico.
   *
   * Sin el corte son 602 ventas en 104 días — veintinueve mil píxeles de
   * tabla. Y el mes es además el período del corte blanco/negro: es lo
   * que José y su socio miran para decidir, no el acumulado desde que
   * arrancó la planta.
   */
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const delMes = todas.filter((c) => new Date(c.momento) >= desde);

  const ventas = delMes
    .filter((c) => c.clienteId && c.estado !== 'anulada' && c.total > 0)
    .reverse() as Carga[];

  return {
    ahora,
    /** Desde cuándo se está contando. La pantalla tiene que decirlo. */
    desde: desde.toISOString(),
    ventas,
    /**
     * Cuántas cargas están esperando cliente. No son ventas todavía,
     * pero la pantalla tiene que decir que existen: son la razón por la
     * que el total de acá no cuadra con la producción del día.
     */
    sinAsignar: delMes.filter((c) => !c.clienteId && c.estado !== 'anulada').length,
    /** Cómo se llama cada cliente, incluidos los dados de baja. */
    nombresDeCliente: Object.fromEntries(CLIENTES.map((c) => [c.id, c.nombre])),
  };
}

export type DatosVentas = Awaited<ReturnType<typeof traerVentas>>;
