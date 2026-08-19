'use client';

import { cn } from '@/lib/utils';

export interface OpcionSegmentada {
  valor: string;
  etiqueta: string;
  /** El contador que va al lado. Sirve para decidir sin entrar. */
  cantidad?: number;
}

export interface SegmentadoProps {
  opciones: OpcionSegmentada[];
  valor: string;
  onCambio?: (valor: string) => void;
  className?: string;
}

/**
 * El filtro de dos o tres posiciones que vive en el encabezado de una
 * tarjeta: Todas / Sin cliente, Blanco / Negro / Ambos.
 *
 * Lleva el contador adentro a propósito. "Sin cliente · 3" deja decidir
 * si vale la pena entrar; sin el número hay que abrir para enterarse.
 *
 * Si las opciones son más de tres, esto no sirve: va un select.
 */
export function Segmentado({ opciones, valor, onCambio, className }: SegmentadoProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'border-hormigon-300 bg-hormigon-100 inline-flex gap-0.5 rounded-lg border p-0.5',
        className,
      )}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambio?.(o.valor)}
            className={cn(
              'rounded-[calc(var(--radius)-3px)] px-2.5 py-1 text-sm font-medium transition-colors',
              activa
                ? 'bg-card text-hormigon-900 shadow-tarjeta'
                : 'text-hormigon-500 hover:text-hormigon-800',
            )}
          >
            {o.etiqueta}
            {o.cantidad !== undefined ? (
              <span
                className={cn(
                  'num ml-1.5 text-xs',
                  activa ? 'text-hormigon-500' : 'text-hormigon-400',
                )}
              >
                {o.cantidad}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
