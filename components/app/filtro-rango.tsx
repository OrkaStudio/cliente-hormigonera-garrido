'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Segmentado, type OpcionSegmentada } from '@/components/dominio/segmentado';
import { cn } from '@/lib/utils';

export const RANGOS = ['hoy', 'semana', 'mes'] as const;
export type Rango = (typeof RANGOS)[number];

const OPCIONES_INICIO: OpcionSegmentada[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: '7 días' },
  { valor: 'mes', etiqueta: 'Mes' },
];

/**
 * El rango de un resumen.
 *
 * Son tres y no cuatro a propósito: el propio `Segmentado` avisa que con
 * más de tres opciones hay que usar un select.
 *
 * El valor vive en la URL: así el estado sobrevive al refresco automático
 * y un rango se puede compartir tal cual se está mirando. Y como escribe
 * sobre la ruta actual, sirve igual en Inicio y en Rentabilidad — que
 * tienen rangos distintos pero el mismo comportamiento.
 */
export function FiltroRango({
  opciones = OPCIONES_INICIO,
  porDefecto = 'hoy',
  className,
}: {
  opciones?: OpcionSegmentada[];
  porDefecto?: string;
  className?: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const actual = params.get('rango') ?? porDefecto;

  return (
    <Segmentado
      className={cn(pendiente && 'opacity-60', className)}
      opciones={opciones}
      valor={actual}
      onCambio={(v) => {
        iniciar(() => {
          // La ruta sale de usePathname, que no es una ruta literal: el
          // tipado de rutas no puede verificarla y hay que afirmarla.
          const destino = (v === porDefecto ? ruta : `${ruta}?rango=${v}`) as Route;
          router.push(destino, { scroll: false });
        });
      }}
    />
  );
}
