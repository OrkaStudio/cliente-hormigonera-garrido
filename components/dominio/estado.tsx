import { cn } from '@/lib/utils';
import { type Tono, fondoPorTono } from './tono';

export interface EstadoProps {
  children: React.ReactNode;
  tono?: Tono;
  /** Un punto de color al principio. Útil en tablas densas. */
  punto?: boolean;
  className?: string;
}

/**
 * La etiqueta de estado. Se usa para el estado de una carga
 * (pendiente / asignada / anulada), para el stock (normal / bajo /
 * quiebre) y para la marca fiscal.
 */
export function Estado({ children, tono = 'neutro', punto = false, className }: EstadoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        fondoPorTono[tono],
        className,
      )}
    >
      {punto ? <span className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}

/**
 * Blanco o negro.
 *
 * No calculamos nada fiscal — decisión tomada y asentada en
 * decisiones/hormigonera-plataforma-sin-fiscal. Solo marcamos de qué
 * lado cae cada venta y lo mostramos separado; el análisis es de ellos.
 * Por eso esto es una marca visual, deliberadamente sin color de estado:
 * que una venta sea en negro no es un error ni una alarma.
 */
export function MarcaFiscal({ tipo }: { tipo: 'blanco' | 'negro' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        tipo === 'blanco'
          ? 'border-line bg-white text-ink-soft'
          : 'border-ink bg-ink text-white',
      )}
    >
      {tipo === 'blanco' ? 'Blanco' : 'Negro'}
    </span>
  );
}
