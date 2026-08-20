/**
 * El tono es el vocabulario de estado del sistema. Un componente nunca
 * elige un color: elige un tono, y el sistema decide cómo se ve.
 *
 * Si mañana el rojo cambia, cambia acá y en toda la aplicación.
 */
export type Tono = 'neutro' | 'ok' | 'warn' | 'danger' | 'plc';

export const textoPorTono: Record<Tono, string> = {
  neutro: 'text-ink',
  ok: 'text-ok-text',
  warn: 'text-warn-text',
  danger: 'text-danger-text',
  plc: 'text-plc-text',
};

export const fondoPorTono: Record<Tono, string> = {
  neutro: 'bg-sunk text-ink-soft border-line',
  ok: 'bg-ok-soft text-ok-text border-ok/30',
  warn: 'bg-warn-soft text-warn-text border-warn/30',
  danger: 'bg-danger-soft text-danger-text border-danger/30',
  plc: 'bg-plc-soft text-plc-text border-plc/30',
};

export const barraPorTono: Record<Tono, string> = {
  neutro: 'bg-line-strong',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  plc: 'bg-plc',
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
  if (desvio <= 3) return 'warn';
  return 'danger';
}

/** El tinte del 10%, para fondos de baja intensidad. */
export const washPorTono: Record<Tono, string> = {
  neutro: 'from-sunk',
  ok: 'from-ok-wash',
  warn: 'from-warn-wash',
  danger: 'from-danger-wash',
  plc: 'from-plc/10',
};
