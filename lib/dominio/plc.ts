/**
 * El ciclo del autómata.
 *
 * Modelado sobre lo que el flujo de Node-RED lee de verdad del HMI
 * (`node-red/flows.json`), no sobre lo que sería cómodo:
 *
 *   · El registro 20 es el estado del proceso: 0 parado · 1 automático ·
 *     2 pausa.
 *   · El disparador NO es el paso del tiempo, es la TRANSICIÓN de
 *     automático a parado. Por eso se guarda una fila por carga y no una
 *     lectura cada dos segundos.
 *   · Modbus son enteros de 16 bits: los decimales llegan multiplicados
 *     por 100 y hay que dividirlos al leer.
 *
 * ⚠️ El mapa de registros es el FICTICIO del simulador. El de GENROD
 * todavía no llegó, y es el bloqueante real del proyecto.
 */

export type EstadoPlc = 'parado' | 'automatico' | 'pausa';

/** Lo que el PLC dosifica, en el orden en que lo hace. */
export const MATERIALES_PLC = ['Cemento', 'Agua', 'Áridos', 'Aditivo'] as const;
export type MaterialPlc = (typeof MATERIALES_PLC)[number];

export interface DosificacionEnCurso {
  material: MaterialPlc;
  objetivo: number;
  /** Lo que lleva pesado hasta ahora. Sube mientras el ciclo corre. */
  real: number;
  unidad: string;
}

export interface CicloPlc {
  /** El correlativo del autómata: es la identidad que evita duplicados (R3). */
  batch: number;
  estado: EstadoPlc;
  receta: string;
  m3: number;
  /** Desde cuándo viene dosificando. */
  arranque: string;
  dosificacion: DosificacionEnCurso[];
  /** 0 a 1. Cuánto del ciclo lleva hecho. */
  avance: number;
}

/**
 * Cuánto se pasó o le faltó a una dosificación, en porcentaje.
 *
 * Contra el OBJETIVO que pidió el PLC, no contra la receta declarada: son
 * dos comparaciones distintas y confundirlas manda a calibrar una balanza
 * que está bien.
 */
export function desvioDosificacion(d: DosificacionEnCurso): number {
  if (!d.objetivo) return 0;
  return ((d.real - d.objetivo) / d.objetivo) * 100;
}

/**
 * ¿Terminó el ciclo?
 *
 * La carga se crea en esta transición y en ninguna otra. Mientras el
 * estado siga en automático, lo que se ve en pantalla es una dosificación
 * en curso, no una carga: todavía no existe y no le suma a nadie.
 */
export function cerroElCiclo(previo: EstadoPlc, actual: EstadoPlc): boolean {
  return previo === 'automatico' && actual === 'parado';
}

export const ROTULO_ESTADO: Record<EstadoPlc, string> = {
  parado: 'Parada',
  automatico: 'Dosificando',
  pausa: 'En pausa',
};
