'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface PuntoSerie {
  etiqueta: string;
  /** Lo que se cobró por m³. */
  precio: number;
  /** Lo que costaron los materiales de ese m³. */
  costo: number;
}

/**
 * Precio y costo por m³, mes a mes.
 *
 * Dos líneas en UN eje, no dos ejes: comparten unidad ($/m³) y el punto
 * del gráfico es justamente la distancia entre ellas. Con dos escalas,
 * esa distancia no significaría nada.
 *
 * El área entre las dos es el margen. Cuando se angosta, la inflación se
 * lo está comiendo — que es lo que un número de facturación creciente
 * esconde: se factura más y se gana menos.
 */
export function LineaMargen({
  datos,
  formato,
  className,
}: {
  datos: PuntoSerie[];
  formato: (n: number) => string;
  className?: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);

  if (datos.length < 2) return null;

  const W = 100;
  const H = 42;
  const valores = datos.flatMap((d) => [d.precio, d.costo]);
  const max = Math.max(...valores) * 1.08;
  const min = Math.min(...valores) * 0.92;
  const span = max - min || 1;

  const x = (i: number) => (i / (datos.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * H;

  const linea = (sel: (d: PuntoSerie) => number) =>
    datos.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(sel(d)).toFixed(2)}`).join(' ');

  const area =
    `M ${x(0).toFixed(2)} ${y(datos[0]!.precio).toFixed(2)} ` +
    datos.map((d, i) => `L ${x(i).toFixed(2)} ${y(d.precio).toFixed(2)}`).join(' ') +
    ' ' +
    [...datos].reverse().map((d, j) => {
      const i = datos.length - 1 - j;
      return `L ${x(i).toFixed(2)} ${y(d.costo).toFixed(2)}`;
    }).join(' ') +
    ' Z';

  const p = activo !== null ? datos[activo]! : datos.at(-1)!;
  const margen = p.precio - p.costo;

  return (
    <div className={className}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-40 w-full"
          role="img"
          aria-label="Precio y costo por metro cúbico, mes a mes"
        >
          <path d={area} className="fill-s3/12" />
          <path
            d={linea((d) => d.precio)}
            className="stroke-s1 fill-none"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          <path
            d={linea((d) => d.costo)}
            className="stroke-s2 fill-none"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
          {activo !== null && (
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={0}
              y2={H}
              className="stroke-line-strong"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Zonas de hover del ancho de la columna: apuntar a una línea de
            2 px con el mouse es imposible. */}
        <div className="absolute inset-0 flex">
          {datos.map((d, i) => (
            <button
              key={d.etiqueta}
              type="button"
              className="flex-1 cursor-default"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              aria-label={`${d.etiqueta}: precio ${formato(d.precio)}, costo ${formato(d.costo)}`}
            />
          ))}
        </div>
      </div>

      <div className="border-line mt-1.5 flex border-t pt-1.5">
        {datos.map((d, i) => (
          <span
            key={d.etiqueta}
            className={cn(
              'text-faint flex-1 text-center font-mono text-[10px] uppercase',
              activo === i && 'text-ink',
            )}
          >
            {d.etiqueta}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-faint">{p.etiqueta}</span>
        <span className="flex items-center gap-1.5">
          <span className="bg-s1 inline-block h-0.5 w-3 rounded-full" aria-hidden />
          <span className="text-faint text-xs">precio</span>
          <span className="font-mono tabular-nums">{formato(p.precio)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="bg-s2 inline-block h-0.5 w-3 rounded-full opacity-70"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg,var(--s2) 0 4px,transparent 4px 7px)' }}
            aria-hidden
          />
          <span className="text-faint text-xs">costo</span>
          <span className="font-mono tabular-nums">{formato(p.costo)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-faint text-xs">margen</span>
          <span className="font-mono font-medium tabular-nums">{formato(margen)}</span>
        </span>
      </div>
    </div>
  );
}
