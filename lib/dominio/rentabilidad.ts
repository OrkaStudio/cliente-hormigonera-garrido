import type { Carga } from '@/lib/datos/tipos';

/**
 * Rentabilidad — apartado 8.
 *
 * ⚠️ El número que sale de acá se llama **margen de materiales**, nunca
 * "margen" a secas (R1). No es una limitación escondida: es lo único que
 * se puede calcular con precisión, y la diferencia importa. Si la app
 * dijera "margen 39%" y José sabe que el suyo es 25%, no va a pensar que
 * faltan los sueldos — va a pensar que la app está mal, y a partir de ahí
 * tampoco le cree al stock.
 *
 * Por eso los costos fijos se cargan aparte y se muestran aparte: el
 * margen de materiales es un hecho, el margen después de fijos es una
 * cuenta que depende de lo que José haya cargado.
 */

/** Un costo que no depende de cuánto se produzca. */
export interface CostoFijo {
  id: string;
  nombre: string;
  /** Por mes, en pesos de hoy. */
  mensual: number;
}

export interface CostoDeCarga {
  /** Lo que se le cobró al cliente por esta carga. */
  facturado: number;
  /** Lo que costaron los materiales que efectivamente se pesaron. */
  costo: number;
  /** facturado − costo. NO es el margen del negocio: no incluye fijos. */
  margen: number;
  /** El margen como proporción de lo facturado. */
  margenPct: number;
  /** Cuánto costó cada material de esta carga. */
  porMaterial: { material: string; kilos: number; costo: number }[];
  /** Falta el costo de algún material: el margen que sale está inflado (R6). */
  incompleto: boolean;
}

/**
 * Cuánto dejó una carga.
 *
 * Usa el peso REAL, no el objetivo: si la balanza tiró 2% de cemento de
 * más, esa plata salió del bolsillo de José aunque la receta dijera otra
 * cosa. Y usa el precio congelado en la venta (R2).
 */
export function costoDeCarga(
  carga: Carga,
  costoPorMaterial: (material: string) => number | null,
): CostoDeCarga {
  let costo = 0;
  let incompleto = false;
  const porMaterial: CostoDeCarga['porMaterial'] = [];

  for (const p of carga.pesadas) {
    const unitario = costoPorMaterial(p.material);
    if (unitario === null) {
      incompleto = true;
      continue;
    }
    const parcial = p.real * unitario;
    costo += parcial;
    porMaterial.push({ material: p.material, kilos: p.real, costo: parcial });
  }

  const facturado = carga.total;
  const margen = facturado - costo;

  return {
    facturado,
    costo,
    margen,
    margenPct: facturado ? (margen / facturado) * 100 : 0,
    porMaterial,
    incompleto,
  };
}

export interface ResumenPeriodo {
  cargas: number;
  m3: number;
  facturado: number;
  costoMateriales: number;
  margenMateriales: number;
  margenPct: number;
  /** Precio promedio ponderado por m³, para ver si el precio siguió a la inflación. */
  precioPorM3: number;
  costoPorM3: number;
  margenPorM3: number;
  /** Alguna carga no pudo costearse entera (R6). */
  incompleto: boolean;
}

export function resumirPeriodo(
  cargas: Carga[],
  costoPorMaterial: (material: string, momento: string) => number | null,
): ResumenPeriodo {
  let facturado = 0;
  let costoMateriales = 0;
  let m3 = 0;
  let incompleto = false;

  for (const c of cargas) {
    const r = costoDeCarga(c, (mat) => costoPorMaterial(mat, c.momento));
    facturado += r.facturado;
    costoMateriales += r.costo;
    m3 += c.m3;
    if (r.incompleto) incompleto = true;
  }

  const margenMateriales = facturado - costoMateriales;

  return {
    cargas: cargas.length,
    m3,
    facturado,
    costoMateriales,
    margenMateriales,
    margenPct: facturado ? (margenMateriales / facturado) * 100 : 0,
    precioPorM3: m3 ? facturado / m3 : 0,
    costoPorM3: m3 ? costoMateriales / m3 : 0,
    margenPorM3: m3 ? margenMateriales / m3 : 0,
    incompleto,
  };
}

/**
 * Lo que queda después de los costos que no dependen de la producción.
 *
 * La spec es explícita: los fijos se agregan "pero eso se decide con
 * José, no por default". Por eso la función devuelve null si no hay nada
 * cargado, y la pantalla muestra el hueco en vez de un margen que parece
 * real y no lo es.
 */
export function margenDespuesDeFijos(
  margenMateriales: number,
  fijos: CostoFijo[],
  /** Qué proporción del mes cubre el período mirado. */
  proporcionDelMes = 1,
): { fijos: number; resultado: number; resultadoPct: number } | null {
  if (fijos.length === 0) return null;

  const total = fijos.reduce((a, f) => a + f.mensual, 0) * proporcionDelMes;
  const resultado = margenMateriales - total;

  return {
    fijos: total,
    resultado,
    resultadoPct: margenMateriales ? (resultado / margenMateriales) * 100 : 0,
  };
}

/**
 * Cuánto cambió un número contra el período anterior.
 *
 * Es la única vara honesta que tenemos: los promedios del rubro que
 * circulan son de plantas grandes de otros países, y compararse contra
 * ellos diría más de la muestra que de la planta de Monte.
 */
export function variacion(actual: number, previo: number): number | null {
  if (!previo) return null;
  return ((actual - previo) / Math.abs(previo)) * 100;
}

/**
 * ¿El precio le está ganando a la inflación de los costos?
 *
 * En un país con 4% mensual, facturar más que el mes pasado no significa
 * nada por sí solo. Lo que importa es si el precio subió al menos tanto
 * como el costo: si no, el margen se achica aunque la facturación crezca,
 * y ese es el error más caro que puede cometer una planta.
 */
export function carreraDePrecios(
  actual: ResumenPeriodo,
  previo: ResumenPeriodo,
): { precio: number; costo: number; gana: boolean } | null {
  const precio = variacion(actual.precioPorM3, previo.precioPorM3);
  const costo = variacion(actual.costoPorM3, previo.costoPorM3);
  if (precio === null || costo === null) return null;
  return { precio, costo, gana: precio >= costo };
}
