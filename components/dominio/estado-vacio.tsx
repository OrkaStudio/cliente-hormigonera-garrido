import { cn } from '@/lib/utils';

export interface EstadoVacioProps {
  titulo: string;
  /** Por qué está vacío y qué hacer. Nunca "no hay datos" a secas. */
  descripcion?: string;
  accion?: React.ReactNode;
  className?: string;
}

/**
 * La pantalla sin datos.
 *
 * En esta aplicación el vacío suele ser información real: "hoy la planta
 * todavía no produjo" no es un error, es el estado de las 7 de la mañana.
 * Por eso el texto explica la causa en vez de disculparse.
 */
export function EstadoVacio({ titulo, descripcion, accion, className }: EstadoVacioProps) {
  return (
    <div
      className={cn(
        'border-line flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <p className="font-medium text-ink-soft">{titulo}</p>
      {descripcion ? (
        <p className="text-faint max-w-sm text-sm">{descripcion}</p>
      ) : null}
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  );
}
