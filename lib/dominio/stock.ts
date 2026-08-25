import type { Carga, Material } from '@/lib/datos/tipos';

/**
 * Stock — la mitad de arriba del apartado unificado.
 *
 * La planta NO tiene balanzas en los silos. Nadie puede mirar una pantalla
 * y saber cuánto cemento queda: el número se deduce restando lo que se
 * consumió a lo que entró, y se corrige a ojo cada tanto.
 *
 * De ahí salen las dos reglas que ordenan todo el apartado:
 *
 *  · R1 — el stock no se declara, se deduce. Lo único manual es el
 *    inicial y los ajustes.
 *  · R4 — la merma se mide, no se supone: es la diferencia acumulada
 *    entre lo que la cuenta decía y lo que había de verdad. Un dato que
 *    hoy no tiene nadie en la planta.
 */

export interface AjusteStock {
  id: string;
  material: string;
  fecha: string;
  /** Lo que había de verdad, según quien miró el silo. */
  declarado: number;
  /** Lo que la cuenta decía que tenía que haber. */
  calculado: number;
  motivo?: string;
}

/** declarado − calculado. Negativo es material que se perdió. */
export function diferenciaDeAjuste(a: AjusteStock): number {
  return a.declarado - a.calculado;
}

/**
 * La merma medida de un material.
 *
 * No es una constante de manual: es lo que efectivamente faltó cada vez
 * que alguien miró el silo, sobre lo que la cuenta decía. Con un solo
 * ajuste no significa nada; con varios, es el número real de la planta.
 */
export function mermaMedida(ajustes: AjusteStock[]): { pct: number; sobre: number } | null {
  const conBase = ajustes.filter((a) => a.calculado > 0);
  if (conBase.length === 0) return null;

  const perdido = conBase.reduce((a, x) => a + Math.max(0, x.calculado - x.declarado), 0);
  const base = conBase.reduce((a, x) => a + x.calculado, 0);

  return { pct: (perdido / base) * 100, sobre: conBase.length };
}

/**
 * Cuánto se consumió de un material, sumando el peso REAL de cada carga.
 *
 * R2 — una carga anulada descuenta igual: el cemento se usó aunque la
 * venta no exista. Si no, el stock miente justo cuando más importa.
 */
export function consumoDe(material: string, cargas: Carga[]): number {
  return cargas.reduce(
    (a, c) => a + (c.pesadas.find((p) => p.material === material)?.real ?? 0),
    0,
  );
}

/**
 * El consumo diario real de un material.
 *
 * R8 — se promedia sobre días CON producción, no sobre días corridos: un
 * fin de semana largo no puede hacer parecer que sobra material.
 *
 * Vive acá y no en cada consulta porque Inicio y Materiales lo mostraban
 * distinto: uno usaba el valor fijo de la semilla y el otro lo calculaba,
 * y el mismo silo decía "9 días" en una pantalla y "3 días" en la otra.
 */
export function consumoDiarioDe(
  material: string,
  cargas: Carga[],
): { porDia: number; dias: number } {
  const dias = new Set(cargas.map((c) => new Date(c.momento).toDateString())).size;
  if (dias === 0) return { porDia: 0, dias: 0 };
  return { porDia: Math.round(consumoDe(material, cargas) / dias), dias };
}

/**
 * Días de producción que aguanta lo que queda.
 *
 * R8 — el consumo se promedia sobre días CON producción, no sobre días
 * corridos. Un fin de semana largo no puede hacer parecer que sobra
 * material.
 */
export function diasQueAguanta(restante: number, consumoDiario: number): number | null {
  if (consumoDiario <= 0) return null;
  return Math.floor(restante / consumoDiario);
}

export type NivelStock = 'ok' | 'bajo' | 'quiebre' | 'sin-dato';

export function nivelDeStock(dias: number | null, diasAviso: number): NivelStock {
  if (dias === null) return 'sin-dato';
  if (dias <= 1) return 'quiebre';
  if (dias <= diasAviso) return 'bajo';
  return 'ok';
}

/**
 * Cuánto conviene pedir.
 *
 * R6 — respeta la capacidad del silo: no tiene sentido sugerir 50 t si
 * entran 30. Y se devuelve en la unidad en que se COMPRA, no en la que
 * se pesa: nadie le pide 37.600 kg de cemento al proveedor, le pide 37
 * toneladas.
 */
export function sugerenciaDeCompra(m: Material): { cantidad: number; unidad: string } | null {
  if (m.sinStock || m.restante === null || m.capacidad === null) return null;

  const falta = m.capacidad - m.restante;
  if (falta <= 0) return null;

  const factor = m.factorConversion ?? 1;
  const unidad = m.unidadCompra ?? m.unidad;

  return { cantidad: Math.floor(falta / factor), unidad };
}

export interface DosificacionDeReceta {
  material: string;
  porM3: number;
  unidad: string;
}

export interface CuantoSale {
  receta: string;
  /** Cuántos m³ salen con lo que hay en los silos. */
  m3: number;
  /** El material que se acaba primero. Es lo que hay que comprar. */
  frena: string;
  /** Qué daría cada material por su cuenta, para poder mostrarlo. */
  porMaterial: { material: string; m3: number }[];
}

/**
 * Cuánto hormigón se puede producir todavía, y qué material lo frena.
 *
 * Es el cruce que el apartado 7 tiene dibujado como flujo y que la
 * pantalla no mostraba: stock de cada material dividido lo que la receta
 * lleva por m³, y el MENOR de todos manda. Da igual que sobren áridos
 * para 240 m³ si el cemento alcanza para 109.
 *
 * El agua queda afuera: sale del pozo, no hay existencia que limite.
 * Un material sin stock deducido tampoco puede frenar nada — no se
 * inventa un límite a partir de un número que no existe.
 */
export function cuantoSale(
  receta: { codigo: string; dosificacion: DosificacionDeReceta[] },
  materiales: Material[],
): CuantoSale | null {
  const porMaterial: { material: string; m3: number }[] = [];

  for (const dosis of receta.dosificacion) {
    if (dosis.porM3 <= 0) continue;
    const m = materiales.find((x) => x.nombre === dosis.material);
    if (!m || m.sinStock || m.restante === null) continue;
    porMaterial.push({ material: dosis.material, m3: Math.floor(m.restante / dosis.porM3) });
  }

  if (porMaterial.length === 0) return null;

  const cuello = porMaterial.reduce((a, b) => (b.m3 < a.m3 ? b : a));
  return { receta: receta.codigo, m3: cuello.m3, frena: cuello.material, porMaterial };
}

/**
 * La barra del stock mide DÍAS, no llenado del silo.
 *
 * Con el llenado, el material que menos lleno está puede ser el que
 * mejor está: el aditivo va al 39% del silo y aguanta 13 días, contra
 * un cemento al 76% que aguanta 3. Pintar esa barra con el color del
 * semáforo hace que la barra y el color digan cosas opuestas.
 *
 * Midiendo días contra el que más aguanta, barra corta es poco tiempo y
 * el color acompaña. Devuelve null cuando no hay con qué comparar.
 */
export function proporcionDeDias(dias: number | null, maximo: number): number | null {
  if (dias === null || maximo <= 0) return null;
  return Math.min((dias / maximo) * 100, 100);
}
