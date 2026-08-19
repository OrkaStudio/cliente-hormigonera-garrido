import { cn } from '@/lib/utils';

export interface EncabezadoPaginaProps {
  titulo: string;
  /** La fecha, el contexto, el "última carga a las 14:20". */
  bajada?: React.ReactNode;
  /** Botones de la derecha. */
  acciones?: React.ReactNode;
  className?: string;
}

/** El encabezado de los nueve apartados. Uno solo, para que no se desalineen. */
export function EncabezadoPagina({
  titulo,
  bajada,
  acciones,
  className,
}: EncabezadoPaginaProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-hormigon-900">{titulo}</h1>
        {bajada ? <div className="text-hormigon-500 mt-1 text-sm">{bajada}</div> : null}
      </div>
      {acciones ? <div className="flex items-center gap-2">{acciones}</div> : null}
    </header>
  );
}
