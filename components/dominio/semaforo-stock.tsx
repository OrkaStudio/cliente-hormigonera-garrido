import { cn } from '@/lib/utils';
import { num } from '@/lib/formato';
import { Cifra } from './cifra';
import { type Tono, barraPorTono } from './tono';

export interface SemaforoStockProps {
  material: string;
  /** Existencia estimada. Ojo: deducida, no medida. */
  restante: number;
  /** Capacidad del silo, para dar la proporción. */
  capacidad: number;
  unidad?: string;
  /** Días de producción que aguanta al ritmo actual. */
  diasRestantes?: number;
  className?: string;
}

function tonoDeStock(proporcion: number): Tono {
  if (proporcion <= 0.1) return 'danger';
  if (proporcion <= 0.25) return 'warn';
  return 'ok';
}

/**
 * Cuánto queda en el silo y cuándo se quiebra.
 *
 * Advertencia que el componente lleva escrita en la cara: los silos de
 * la planta NO tienen balanza. Este número es deducido — entradas por
 * compra menos consumo por carga. Se desvía de la realidad y hay que
 * recalibrarlo a ojo cada tanto. Mostrarlo como si fuera una medición
 * sería mentir, así que la etiqueta "estimado" no es opcional.
 */
export function SemaforoStock({
  material,
  restante,
  capacidad,
  unidad = 'kg',
  diasRestantes,
  className,
}: SemaforoStockProps) {
  const proporcion = capacidad ? Math.max(0, Math.min(restante / capacidad, 1)) : 0;
  const tono = tonoDeStock(proporcion);

  return (
    <div className={cn('border-line bg-card shadow-tarjeta rounded-lg border p-4', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-ink">{material}</p>
        <span className="text-faint text-[11px] tracking-wide uppercase">estimado</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <Cifra valor={num(restante)} unidad={unidad} tono={tono} tamano="lg" />
        <span className="text-faint num text-sm">de {num(capacidad)}</span>
      </div>

      <div className="bg-sunk mt-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full', barraPorTono[tono])}
          style={{ width: `${proporcion * 100}%` }}
        />
      </div>

      {diasRestantes !== undefined ? (
        <p className="text-faint mt-2 text-xs">
          Al ritmo de los últimos días, aguanta{' '}
          <span className="num font-medium text-ink-soft">{num(diasRestantes)}</span>{' '}
          {diasRestantes === 1 ? 'día' : 'días'}
        </p>
      ) : null}
    </div>
  );
}
