/**
 * El costo del viaje.
 *
 * José no tiene forma de saber hoy cuánto le cuesta llevar el hormigón a
 * una obra lejos, y por eso cobra el mismo precio a doce kilómetros que a
 * sesenta. Con la distancia cargada en la venta, eso se puede calcular:
 * el dato ya existe, se anota en el remito para el chofer.
 *
 * ⚠️ NO es el costo real del flete. Falta el chofer, el desgaste, los
 * peajes y el tiempo del mixer parado en la obra. Es sólo el gasoil, y la
 * pantalla lo dice: preferimos un número chico y cierto a uno grande e
 * inventado.
 */

export interface ParametrosFlete {
  /** Litros cada 100 km yendo cargado. */
  consumoCargado: number;
  /** Litros cada 100 km volviendo vacío. */
  consumoVacio: number;
  /** Pesos por litro de gasoil. */
  precioLitro: number;
}

/**
 * Valores por defecto, para que la cuenta exista antes de que José los
 * confirme.
 *
 * Un camión de carga general promedia 35 L/100 km y los grandes llegan a
 * 38; un mixer va más pesado todavía yendo, y vuelve liviano. El gasoil
 * grado 2 rondaba los $2.200 en agosto de 2026.
 *
 * Los tres son configurables: son los números que más se mueven, y un
 * flete calculado con el gasoil del año pasado no sirve para decidir.
 */
export const FLETE_POR_DEFECTO: ParametrosFlete = {
  consumoCargado: 48,
  consumoVacio: 32,
  precioLitro: 2200,
};

/** Litros que se queman en ir y volver de una obra a `km` de la planta. */
export function litrosDelViaje(km: number, p: ParametrosFlete = FLETE_POR_DEFECTO): number {
  if (km <= 0) return 0;
  return (km * p.consumoCargado) / 100 + (km * p.consumoVacio) / 100;
}

/** Lo que cuesta el gasoil de ese viaje. */
export function costoCombustible(km: number, p: ParametrosFlete = FLETE_POR_DEFECTO): number {
  return litrosDelViaje(km, p) * p.precioLitro;
}

/**
 * Hasta qué distancia el viaje deja algo.
 *
 * Es el número que hoy nadie puede contestar: a partir de acá, el gasoil
 * se come todo el margen de materiales de esa carga y llevarla cuesta
 * plata en vez de dejarla.
 */
export function kmDondeSeComeElMargen(
  margenDeLaCarga: number,
  p: ParametrosFlete = FLETE_POR_DEFECTO,
): number | null {
  const porKm = ((p.consumoCargado + p.consumoVacio) / 100) * p.precioLitro;
  if (porKm <= 0 || margenDeLaCarga <= 0) return null;
  return margenDeLaCarga / porKm;
}

/** Las franjas con las que se agrupan los viajes. */
export const FRANJAS = [
  { hasta: 10, etiqueta: '0–10 km' },
  { hasta: 25, etiqueta: '10–25 km' },
  { hasta: 50, etiqueta: '25–50 km' },
  { hasta: Infinity, etiqueta: '+50 km' },
] as const;

export function franjaDe(km: number): string {
  return FRANJAS.find((f) => km <= f.hasta)!.etiqueta;
}
