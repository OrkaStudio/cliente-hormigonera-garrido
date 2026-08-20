'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Segmentado } from '@/components/dominio/segmentado';
import { cn } from '@/lib/utils';

export const RANGOS = ['hoy', 'semana', 'mes'] as const;
export type Rango = (typeof RANGOS)[number];

const OPCIONES = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: '7 días' },
  { valor: 'mes', etiqueta: 'Mes' },
];

/**
 * El rango del resumen.
 *
 * Son tres y no cuatro a propósito: el propio `Segmentado` avisa que con
 * más de tres opciones hay que usar un select. "Ayer" quedó afuera porque
 * es la que menos se mira — lo de ayer ya se sabe.
 *
 * El valor vive en la URL: así el estado sobrevive al refresco automático
 * y un rango se puede compartir por WhatsApp tal cual se está mirando.
 */
export function FiltroRango({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const actual = (params.get('rango') ?? 'hoy') as Rango;

  return (
    <Segmentado
      className={cn(pendiente && 'opacity-60', className)}
      opciones={OPCIONES}
      valor={actual}
      onCambio={(v) => {
        iniciar(() => {
          router.push(v === 'hoy' ? '/' : `/?rango=${v}`, { scroll: false });
        });
      }}
    />
  );
}
