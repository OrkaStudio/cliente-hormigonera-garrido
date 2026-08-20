import { derivarAlertas, estadoDePlanta } from '@/lib/dominio/alertas';
import { CLIENTES, MATERIALES, generarCargas } from './semilla';
import type { Carga } from './tipos';

/**
 * La carga guarda el id del cliente; la pantalla necesita el nombre.
 * Resolverlo es trabajo de la capa de datos, no de la vista — el día que
 * entre Supabase esto es un join y la pantalla no se entera.
 */
function conNombreDeCliente(carga: Carga) {
  return {
    ...carga,
    clienteNombre: CLIENTES.find((c) => c.id === carga.clienteId)?.nombre ?? null,
  };
}

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
export type Rango = 'hoy' | 'semana' | 'mes';

const ETIQUETA: Record<Rango, string> = {
  hoy: 'de hoy',
  semana: 'de los últimos 7 días',
  mes: 'del mes',
};

/** Desde cuándo cuenta cada rango. */
function desde(rango: Rango, ahora: Date) {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  if (rango === 'semana') d.setDate(d.getDate() - 6);
  if (rango === 'mes') d.setDate(1);
  return d;
}

export async function traerInicio(rango: Rango = 'hoy', ahora = new Date()) {
  const cargas = generarCargas(ahora);
  const corte = desde(rango, ahora);
  const deHoy = cargas.filter((c) => new Date(c.momento) >= corte);

  const planta = estadoDePlanta(cargas, ahora);
  const alertas = derivarAlertas(cargas, MATERIALES, ahora);

  return {
    ahora,
    rango,
    etiquetaRango: ETIQUETA[rango],
    planta,
    alertas,
    materiales: MATERIALES,
    hoy: {
      cargas: deHoy.length,
      m3: deHoy.reduce((a, c) => a + c.m3, 0),
      facturado: deHoy.reduce((a, c) => a + c.total, 0),
      sinAsignar: deHoy.filter((c) => !c.clienteId).length,
    },
    ultimas: [...deHoy]
      .reverse()
      .slice(0, rango === 'hoy' ? 8 : 12)
      .map(conNombreDeCliente),
    /** Cuántas hay en total en el rango, para no mentir con el pie de tabla. */
    totalCargas: deHoy.length,
  };
}

export type DatosInicio = Awaited<ReturnType<typeof traerInicio>>;
