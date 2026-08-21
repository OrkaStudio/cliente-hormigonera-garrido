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

/**
 * Todo lo que Inicio muestra, derivado de las cargas. Puro y sincrónico.
 *
 * Está separado de `traerInicio` porque tiene que poder correr DOS veces:
 * una en el servidor con lo que vino de la fuente, y otra en el navegador
 * después de aplicarle las asignaciones que todavía viven en
 * `localStorage`. Si la derivación viviera adentro del fetch, asignarle
 * un cliente a una carga no movería ni el KPI ni la alerta.
 *
 * Cuando exista Supabase, la asignación se guarda de verdad y el segundo
 * pase deja de hacer falta — pero esta función se queda igual.
 */
export function derivarResumen(cargas: Carga[], rango: Rango, ahora: Date) {
  const corte = desde(rango, ahora);
  const enRango = cargas.filter((c) => new Date(c.momento) >= corte);

  return {
    ahora,
    rango,
    etiquetaRango: ETIQUETA[rango],
    planta: estadoDePlanta(cargas, ahora),
    alertas: derivarAlertas(cargas, MATERIALES, ahora),
    materiales: MATERIALES,
    cargas,
    hoy: {
      cargas: enRango.length,
      m3: enRango.reduce((a, c) => a + c.m3, 0),
      facturado: enRango.reduce((a, c) => a + c.total, 0),
      sinAsignar: enRango.filter((c) => !c.clienteId).length,
    },
    ultimas: [...enRango]
      .reverse()
      .slice(0, rango === 'hoy' ? 8 : 12)
      .map(conNombreDeCliente),
    /** Cuántas hay en total en el rango, para no mentir con el pie de tabla. */
    totalCargas: enRango.length,
  };
}

export async function traerInicio(rango: Rango = 'hoy', ahora = new Date()) {
  return derivarResumen(generarCargas(ahora), rango, ahora);
}

export type DatosInicio = ReturnType<typeof derivarResumen>;

/** Los clientes a los que se le puede asignar una carga. */
export function clientesAsignables() {
  return CLIENTES.filter((c) => c.activo).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    generico: c.generico,
  }));
}

export type ClienteAsignable = ReturnType<typeof clientesAsignables>[number];
