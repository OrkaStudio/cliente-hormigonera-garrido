import { cn } from '@/lib/utils';
import { Cifra } from './cifra';
import type { Tono } from './tono';

export interface TarjetaKpiProps {
  /** Qué mide. Va arriba, chico y en mayúsculas. */
  rotulo: string;
  valor: string | number;
  unidad?: string;
  /** La aclaración: "camiones despachados", "+12 vs. ayer · 28% de margen". */
  pie?: string;
  tono?: Tono;
  /** Chips de estado o la acción que sigue. Va abajo, separado por una línea. */
  extra?: React.ReactNode;
  className?: string;
}

/**
 * El número grande del tablero. Es la pieza más repetida de la
 * aplicación: aparece en Inicio, en Rentabilidad y arriba de casi
 * cada listado.
 *
 * El rótulo va arriba y el valor abajo a propósito: el ojo baja
 * buscando el número, no sube buscando la etiqueta. El pie lleva la
 * comparación — un número sin referencia no se puede juzgar.
 */
export function TarjetaKpi({
  rotulo,
  valor,
  unidad,
  pie,
  tono = 'neutro',
  extra,
  className,
}: TarjetaKpiProps) {
  return (
    <div
      className={cn(
        'border-line bg-card shadow-tarjeta flex flex-col rounded-lg border p-4',
        className,
      )}
    >
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        {rotulo}
      </p>
      <div className="mt-1.5">
        <Cifra valor={valor} unidad={unidad} tono={tono} tamano="xl" />
      </div>
      {pie ? <p className="text-faint mt-1 text-xs">{pie}</p> : null}
      {extra ? (
        <div className="border-line mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          {extra}
        </div>
      ) : null}
    </div>
  );
}
