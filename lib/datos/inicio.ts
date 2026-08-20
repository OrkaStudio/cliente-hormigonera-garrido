import { derivarAlertas, estadoDePlanta } from '@/lib/dominio/alertas';
import { MATERIALES, generarCargas } from './semilla';
import type { Carga } from './tipos';

/**
 * La consulta de Inicio.
 *
 * Hoy lee de la semilla. Cuando exista el proyecto de Supabase, lo único
 * que cambia es el cuerpo de esta función — la forma que devuelve ya es
 * la que la pantalla consume, así que nada de arriba se toca.
 *
 * Es async a propósito, aunque hoy no espere nada: si fuera sincrónica,
 * el día que entre la query real habría que cambiar también los llamados.
 */
export async function traerInicio(ahora = new Date()) {
  const cargas = generarCargas(ahora);
  const hoy = ahora.toDateString();
  const deHoy = cargas.filter((c) => new Date(c.momento).toDateString() === hoy);

  const planta = estadoDePlanta(cargas, ahora);
  const alertas = derivarAlertas(cargas, MATERIALES, ahora);

  return {
    ahora,
    planta,
    alertas,
    materiales: MATERIALES,
    hoy: {
      cargas: deHoy.length,
      m3: deHoy.reduce((a, c) => a + c.m3, 0),
      facturado: deHoy.reduce((a, c) => a + c.total, 0),
      sinAsignar: deHoy.filter((c) => !c.cliente).length,
    },
    ultimas: [...deHoy].reverse().slice(0, 5) as Carga[],
  };
}

export type DatosInicio = Awaited<ReturnType<typeof traerInicio>>;
