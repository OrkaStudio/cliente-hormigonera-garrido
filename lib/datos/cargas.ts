import { CLIENTES, RECETAS, generarCargas } from './semilla';
import type { Carga } from './tipos';

/**
 * La consulta de Cargas — el tronco.
 *
 * Devuelve las del día separadas por lo que hay que hacer con ellas: las
 * que esperan cliente arriba, el resto abajo. Es la única pantalla donde
 * una carga sin asignar es el sujeto y no una alerta.
 */
export async function traerCargas(ahora = new Date()) {
  const todas = generarCargas(ahora);

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
    clientes: CLIENTES.filter((c) => c.activo).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      generico: c.generico ?? false,
    })),
    /** En qué orden se le asigna color a cada receta. Fijo, nunca cíclico. */
    recetas: Object.keys(RECETAS),
    /** Las últimas del historial, para ver más atrás sin salir. */
    recientes: [...todas.filter((c) => new Date(c.momento).toDateString() !== hoy)]
      .reverse()
      .slice(0, 12) as Carga[],
  };
}

export type DatosCargas = Awaited<ReturnType<typeof traerCargas>>;
