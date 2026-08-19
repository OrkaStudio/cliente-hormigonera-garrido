import { AlertTriangle, CircleAlert, Info, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Tono, barraPorTono, textoPorTono, washPorTono } from './tono';

const iconos = {
  neutro: Info,
  acero: Info,
  ok: CircleCheck,
  atencion: AlertTriangle,
  alarma: CircleAlert,
} as const;

export interface AlertaProps {
  titulo: string;
  children?: React.ReactNode;
  tono?: Tono;
  /** La acción que resuelve la alerta. Una sola. */
  accion?: React.ReactNode;
  className?: string;
}

/**
 * El aviso que interrumpe: quiebre de stock, balanza corrida, carga sin
 * cliente asignado.
 *
 * Va sobre blanco con un riel de color a la izquierda, no con el fondo
 * teñido entero. Dos razones: el texto se lee mejor sobre blanco, y el
 * riel funciona como la franja de estado de un tablero de planta — se
 * identifica de reojo sin leer.
 *
 * Regla de uso: una alerta sin acción posible es ruido. Si no hay nada
 * que el usuario pueda hacer, va como dato en la pantalla, no como alerta.
 */
export function Alerta({ titulo, children, tono = 'atencion', accion, className }: AlertaProps) {
  const Icono = iconos[tono];
  return (
    <div
      className={cn(
        'border-hormigon-300 bg-card shadow-tarjeta relative overflow-hidden rounded-lg border',
        className,
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', barraPorTono[tono])} aria-hidden />
      <div
        className={cn(
          'bg-linear-to-r to-transparent flex gap-3 py-4 pr-4 pl-5',
          washPorTono[tono],
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
            barraPorTono[tono],
          )}
        >
          <Icono className="size-3.5 text-white" aria-hidden strokeWidth={2.5} />
        </span>
        <div className="flex-1">
          <p className={cn('font-semibold', textoPorTono[tono])}>{titulo}</p>
          {children ? (
            <div className="text-hormigon-600 mt-1 text-sm">{children}</div>
          ) : null}
        </div>
        {accion ? <div className="shrink-0 self-center">{accion}</div> : null}
      </div>
    </div>
  );
}
