import { cn } from '@/lib/utils';
import { barraPorTono, tonoDeDesvio } from './tono';

export interface BarraDesvioProps {
  objetivo: number;
  real: number;
  /** Cuánto desvío ocupa la mitad de la barra. Por defecto 5%. */
  escala?: number;
  className?: string;
}

/**
 * El desvío como barra, con el cero en el centro.
 *
 * En una tabla de veinte pastones, el número solo no muestra el patrón.
 * La barra sí: si todas se van para el mismo lado, la balanza está
 * corrida — que es exactamente el hallazgo que le vendimos a José.
 */
export function BarraDesvio({ objetivo, real, escala = 5, className }: BarraDesvioProps) {
  const porcentaje = objetivo ? ((real - objetivo) / objetivo) * 100 : 0;
  const tono = tonoDeDesvio(objetivo, real);
  const ancho = Math.min(Math.abs(porcentaje) / escala, 1) * 50;

  return (
    <div
      className={cn('bg-hormigon-200 relative h-2 w-full rounded-full', className)}
      role="img"
      aria-label={`Desvío de ${porcentaje.toFixed(1)}% respecto del objetivo`}
    >
      {/* La línea del cero: sin referencia visible, la barra no dice nada. */}
      <div className="bg-hormigon-400 absolute top-0 bottom-0 left-1/2 w-px" />
      <div
        className={cn('absolute top-0 bottom-0 rounded-full', barraPorTono[tono])}
        style={
          porcentaje >= 0
            ? { left: '50%', width: `${ancho}%` }
            : { right: '50%', width: `${ancho}%` }
        }
      />
    </div>
  );
}
