/**
 * El tono es el vocabulario de estado del sistema. Un componente nunca
 * elige un color: elige un tono, y el sistema decide cómo se ve.
 *
 * Si mañana el rojo cambia, cambia acá y en toda la aplicación.
 */
export type Tono = 'neutro' | 'ok' | 'atencion' | 'alarma' | 'acero';

export const textoPorTono: Record<Tono, string> = {
  neutro: 'text-hormigon-900',
  ok: 'text-ok-700',
  atencion: 'text-atencion-700',
  alarma: 'text-alarma-700',
  acero: 'text-acero-600',
};

export const fondoPorTono: Record<Tono, string> = {
  neutro: 'bg-hormigon-100 text-hormigon-700 border-hormigon-300',
  ok: 'bg-ok-50 text-ok-700 border-ok-200',
  atencion: 'bg-atencion-50 text-atencion-700 border-atencion-200',
  alarma: 'bg-alarma-50 text-alarma-700 border-alarma-200',
  acero: 'bg-acero-50 text-acero-700 border-acero-200',
};

export const barraPorTono: Record<Tono, string> = {
  neutro: 'bg-hormigon-400',
  ok: 'bg-ok-500',
  atencion: 'bg-atencion-500',
  alarma: 'bg-alarma-500',
  acero: 'bg-acero-500',
};

/**
 * La regla de tolerancia de la planta, en un solo lugar.
 *
 * Un desvío de balanza no es "bueno o malo": es un porcentaje contra
 * el objetivo que pidió el PLC. Hasta 1% es ruido de balanza; hasta 3%
 * merece mirarse; más que eso es plata que se va en cada pastón.
 *
 * Los umbrales son provisorios — hay que confirmarlos con José y con
 * el ingeniero de GENROD antes de que esto llegue a producción.
 */
export function tonoDeDesvio(objetivo: number, real: number): Tono {
  if (!objetivo) return 'neutro';
  const desvio = Math.abs((real - objetivo) / objetivo) * 100;
  if (desvio <= 1) return 'ok';
  if (desvio <= 3) return 'atencion';
  return 'alarma';
}

/** El tinte del 10%, para fondos de baja intensidad. */
export const washPorTono: Record<Tono, string> = {
  neutro: 'from-hormigon-200',
  ok: 'from-ok-wash',
  atencion: 'from-atencion-wash',
  alarma: 'from-alarma-wash',
  acero: 'from-acero-wash',
};
