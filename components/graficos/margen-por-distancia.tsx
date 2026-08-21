'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FranjaViaje {
  franja: string;
  cargas: number;
  m3: number;
  margenPorM3: number;
  combustiblePorM3: number;
  netoPorM3: number;
}

/**
 * Cuánto queda de cada m³ después del gasoil, según lo lejos que esté la
 * obra.
 *
 * Barras apiladas y no dos barras al lado: el total ES el margen de
 * materiales, y el gasoil es una porción que se le come. Puestas al lado,
 * habría que sumarlas con la vista para entender eso.
 *
 * Sin texto que lo explique: el eje dice los kilómetros, la leyenda dice
 * qué es cada color y el número de cada barra dice lo que queda. Si hace
 * falta un párrafo debajo, el gráfico está mal.
 */
export function MargenPorDistancia({
  datos,
  formato,
  className,
}: {
  datos: FranjaViaje[];
  formato: (n: number) => string;
  className?: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);

  if (datos.length === 0) return null;

  const max = Math.max(...datos.map((d) => d.margenPorM3), 1);

  return (
    <div className={className}>
      <div className="flex h-48 items-end gap-3">
        {datos.map((d, i) => {
          const altoTotal = Math.max((d.margenPorM3 / max) * 100, 2);
          const propGasoil = d.margenPorM3 ? (d.combustiblePorM3 / d.margenPorM3) * 100 : 0;
          const esActivo = activo === i;

          return (
            <button
              key={d.franja}
              type="button"
              className="group flex h-full flex-1 cursor-default flex-col justify-end gap-1"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              aria-label={`${d.franja}: quedan ${formato(d.netoPorM3)} por m³ después del gasoil, sobre ${d.cargas} cargas`}
            >
              <span
                className={cn(
                  'font-mono text-xs tabular-nums transition-opacity',
                  activo !== null && !esActivo && 'opacity-40',
                )}
              >
                {formato(d.netoPorM3)}
              </span>

              <span
                className={cn(
                  'flex w-full flex-col justify-end overflow-hidden rounded-t-[4px] transition-opacity',
                  activo !== null && !esActivo && 'opacity-40',
                )}
                style={{ height: `${altoTotal}%` }}
              >
                {/* Lo que se lleva el gasoil, arriba: es la mordida. */}
                <span
                  className="bg-s2 w-full shrink-0"
                  style={{ height: `${Math.min(propGasoil, 100)}%` }}
                />
                {/* 2 px de superficie entre las dos porciones. */}
                <span className="bg-panel h-[2px] w-full shrink-0" />
                <span className="bg-s3 w-full flex-1" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-line mt-1.5 flex gap-3 border-t pt-1.5">
        {datos.map((d, i) => (
          <span
            key={d.franja}
            className={cn(
              'text-faint flex-1 text-center font-mono text-[10px]',
              activo === i && 'text-ink',
            )}
          >
            {d.franja}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-s3 inline-block size-2.5 rounded-[3px]" aria-hidden />
          <span className="text-muted-foreground">queda</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-s2 inline-block size-2.5 rounded-[3px]" aria-hidden />
          <span className="text-muted-foreground">gasoil</span>
        </span>
        {activo !== null && (
          <span className="text-faint ml-auto font-mono tabular-nums">
            {datos[activo]!.cargas} cargas · {formato(datos[activo]!.combustiblePorM3)} de gasoil
          </span>
        )}
      </div>
    </div>
  );
}
