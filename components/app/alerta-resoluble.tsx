'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Alerta as AlertaUI } from '@/components/dominio/alerta';
import { Button } from '@/components/ui/button';
import { textoPorTono } from '@/components/dominio/tono';
import type { Alerta } from '@/lib/dominio/alertas';
import { cn } from '@/lib/utils';

/**
 * Una alerta que se resuelve sin salir de Inicio.
 *
 * La R2 de la spec pide que toda alerta lleve a resolverse: una alerta sin
 * salida es ruido. Los apartados 2, 5 y 7 todavía no existen, así que en vez
 * de un botón que no hace nada, el botón despliega acá lo que hace falta para
 * actuar — qué cargas están sin cliente, la serie de desvíos, a quién llamar.
 *
 * Cuando existan esos apartados, el desplegable sigue sirviendo: es el
 * resumen, y el botón pasa a llevar además a la pantalla completa.
 */
export function AlertaResoluble({ alerta }: { alerta: Alerta }) {
  const [abierta, setAbierta] = useState(false);
  const tieneDetalle = Boolean(alerta.filas?.length);

  return (
    <div>
      <AlertaUI
        titulo={alerta.titulo}
        tono={alerta.tono}
        className={cn(abierta && 'rounded-b-none border-b-0')}
        accion={
          tieneDetalle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAbierta((v) => !v)}
              aria-expanded={abierta}
              aria-controls={`detalle-${alerta.id}`}
            >
              {alerta.accion}
              <ChevronDown
                className={cn('transition-transform', abierta && 'rotate-180')}
                aria-hidden
              />
            </Button>
          ) : undefined
        }
      >
        {alerta.detalle}
      </AlertaUI>

      {/* El detalle cuelga del banner en vez de vivir adentro: así la alerta
          sigue siendo una franja de una línea y el botón no queda flotando
          centrado contra un panel de ocho filas. */}
      {tieneDetalle && abierta && (
        <div
          id={`detalle-${alerta.id}`}
          className="border-line bg-panel rounded-b-lg border border-t-0 px-5 py-3.5"
        >
          {alerta.tituloDetalle && (
            <p className="text-muted-foreground mb-2 font-mono text-[0.68rem] tracking-widest uppercase">
              {alerta.tituloDetalle}
            </p>
          )}

          <ul className="divide-line/70 divide-y">
            {alerta.filas!.map((f) => (
              <li key={f.clave} className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="text-ink-soft text-sm">{f.etiqueta}</span>
                <span
                  className={cn(
                    'font-mono text-sm tabular-nums',
                    f.tono ? textoPorTono[f.tono] : 'text-ink'
                  )}
                >
                  {f.valor}
                </span>
              </li>
            ))}
          </ul>

          {alerta.pieDetalle && (
            <p className="text-muted-foreground mt-2.5 text-xs">{alerta.pieDetalle}</p>
          )}
        </div>
      )}
    </div>
  );
}
