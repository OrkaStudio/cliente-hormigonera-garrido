import type { Carga, Compra, Material } from '@/lib/datos/tipos';
// `sugerenciaDeCompra` de dominio/stock ya calcula cuánto pedir respetando
// la capacidad (R6): no se duplica acá.
import { consumoDe, type AjusteStock } from './stock';

/**
 * El stock deducido — apartados 6 y 7.
 *
 * Los silos no tienen balanza. Nadie puede mirar y saber cuánto cemento
 * queda: la única forma es la resta.
 *
 *     lo que se contó la última vez
 *   + lo que entró desde entonces      (compras)
 *   − lo que se consumió desde entonces (cargas)
 *
 * La spec lo dice con todas las letras: "el stock actual NO es una tabla,
 * es una vista que resta compras y consumo sobre el último ajuste.
 * Guardarlo como número suelto es la forma segura de que se desincronice."
 *
 * La mitad de abajo ya estaba construida —el ajuste a ojo, con su
 * histórico y su merma medida—. Lo que faltaba era la de arriba: sin
 * compras, `restante` era una constante de la semilla debajo de un cartel
 * que decía "se deduce".
 */

export interface StockDeducido {
  /** Cuánto queda, en la unidad de planta. Null si no hay de dónde deducir. */
  restante: number | null;
  /** Desde cuándo se está contando. */
  desde: string | null;
  /** El conteo del que se parte. */
  partida: number;
  entradas: number;
  consumo: number;
  /**
   * Si hay con qué deducir.
   *
   * R7: si un material no tiene compras cargadas, la app LO DICE. Un
   * "sin dato" honesto vale más que un número inventado — que es
   * exactamente lo que había antes, una constante en la semilla debajo
   * de un cartel que decía "se deduce".
   */
  hayDato: boolean;
}

export function stockDeducido(
  material: Pick<Material, 'nombre' | 'sinStock'>,
  compras: Compra[],
  cargas: Carga[],
  ajustes: AjusteStock[],
): StockDeducido {
  const vacio: StockDeducido = {
    restante: null,
    desde: null,
    partida: 0,
    entradas: 0,
    consumo: 0,
    hayDato: false,
  };

  // El agua sale del pozo: se consume, pero no hay existencia que cuidar.
  if (material.sinStock) return vacio;

  const suyos = ajustes
    .filter((a) => a.material === material.nombre)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const ultimo = suyos[0];
  if (!ultimo) return vacio;

  const desde = ultimo.fecha;

  const entradas = compras
    .filter((c) => c.material === material.nombre && !c.anulada && c.momento >= desde)
    .reduce((a, c) => a + c.cantidadConvertida, 0);

  /*
   * Una carga anulada descuenta igual (R2 del apartado 7): el cemento se
   * usó aunque no se haya vendido. `consumoDe` ya no las filtra.
   */
  const consumo = consumoDe(
    material.nombre,
    cargas.filter((c) => c.momento >= desde),
  );

  return {
    restante: Math.max(0, Math.round(ultimo.declarado + entradas - consumo)),
    desde,
    partida: ultimo.declarado,
    entradas: Math.round(entradas),
    consumo: Math.round(consumo),
    hayDato: true,
  };
}

/** La última compra de un material, que es de donde sale el costo de hoy. */
export function ultimaCompra(material: string, compras: Compra[]): Compra | null {
  return (
    compras
      .filter((c) => c.material === material && !c.anulada)
      .sort((a, b) => b.momento.localeCompare(a.momento))[0] ?? null
  );
}

/**
 * El costo de reponer hoy, por unidad de PLANTA.
 *
 * R2 del apartado 6, marcada *"confirmar con José"*: el costo de
 * referencia es el de la ÚLTIMA compra y no un promedio, porque lo que
 * le sirve para poner precio es a cuánto le sale reponer hoy. La pantalla
 * dice de qué fecha sale, así que el supuesto queda a la vista en vez de
 * escondido en un número.
 */
export function costoDeReposicion(
  material: string,
  compras: Compra[],
  factorConversion = 1,
): { costo: number; momento: string } | null {
  const ultima = ultimaCompra(material, compras);
  if (!ultima) return null;
  return { costo: ultima.precioUnitario / factorConversion, momento: ultima.momento };
}
