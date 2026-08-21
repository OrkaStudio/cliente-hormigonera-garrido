'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

export interface PuntoMes {
  etiqueta: string;
  valor: number;
  /** Lo que se muestra al pasar el mouse. Si falta, se usa el valor. */
  detalle?: string;
  /** El período en curso: va rayado, porque todavía no terminó. */ 
  parcial?: boolean;
}

/**
 * La facturación mes a mes.
 *
 * Barras y no línea: son valores de períodos cerrados, no una medición
 * continua. Una línea entre meses sugiere que existe un punto intermedio,
 * y no existe.
 *
 * El mes en curso va rayado. Sin esa marca, un mes que arrancó hace tres
 * días parece una caída y no lo es — es el error de lectura más común en
 * cualquier tablero mensual.
 */
export function BarrasMes({
  datos,
  formato,
  serie = 's1',
  className,
}: {
  datos: PuntoMes[];
  formato: (n: number) => string;
  /** Qué color de la serie usa. Fijo por gráfico, nunca por barra. */
  serie?: 's1' | 's2' | 's3' | 's4';
  className?: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const trama = useId();

  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div className={cn('relative', className)}>
      <div className="flex h-44 items-end gap-2">
        {datos.map((d, i) => {
          const alto = Math.max((d.valor / max) * 100, 1.5);
          const esActivo = activo === i;
          return (
            <button
              key={d.etiqueta}
              type="button"
              className="group flex h-full flex-1 cursor-default flex-col justify-end"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              aria-label={`${d.etiqueta}: ${d.detalle ?? formato(d.valor)}`}
            >
              <span
                className={cn(
                  'w-full rounded-t-[4px] transition-opacity',
                  activo !== null && !esActivo && 'opacity-40',
                )}
                style={{
                  height: `${alto}%`,
                  background: d.parcial
                    ? `repeating-linear-gradient(45deg, var(--${serie}) 0 3px, transparent 3px 7px)`
                    : `var(--${serie})`,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="border-line mt-1.5 flex gap-2 border-t pt-1.5">
        {datos.map((d, i) => (
          <span
            key={d.etiqueta}
            className={cn(
              'text-faint flex-1 text-center font-mono text-[10px] tracking-wide uppercase transition-colors',
              activo === i && 'text-ink',
            )}
          >
            {d.etiqueta}
          </span>
        ))}
      </div>

      {/* Un solo valor a la vista: el del mes que se está mirando, o el
          último si no se está mirando ninguno. Números sobre cada barra
          convierten el gráfico en una tabla fea. */}
      <p className="mt-2 text-sm">
        <span className="text-faint">
          {activo !== null ? datos[activo]!.etiqueta : datos.at(-1)?.etiqueta}
        </span>{' '}
        <span className="font-mono font-medium tabular-nums">
          {activo !== null
            ? (datos[activo]!.detalle ?? formato(datos[activo]!.valor))
            : (datos.at(-1)?.detalle ?? formato(datos.at(-1)?.valor ?? 0))}
        </span>
        {(activo !== null ? datos[activo]!.parcial : datos.at(-1)?.parcial) && (
          <span className="text-faint"> · en curso</span>
        )}
      </p>
      <span className="sr-only" id={trama} />
    </div>
  );
}
