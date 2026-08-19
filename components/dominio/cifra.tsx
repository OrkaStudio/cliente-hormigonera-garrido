import { cn } from '@/lib/utils';
import { type Tono, textoPorTono } from './tono';

const tamanos = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl font-bold',
} as const;

export interface CifraProps {
  /** El número ya formateado, o el número crudo si querés el formato por defecto. */
  valor: string | number;
  /** kg, m³, $ … Se muestra más chica y en gris: la cifra manda. */
  unidad?: string;
  tono?: Tono;
  tamano?: keyof typeof tamanos;
  /** Para cifras de referencia que no son el dato principal (la receta declarada). */
  atenuado?: boolean;
  className?: string;
}

/**
 * Toda cifra de la aplicación pasa por acá.
 *
 * El punto no es el estilo: es que los numerales sean tabulares. En una
 * columna de kg o de pesos, sin ancho fijo por dígito los números bailan
 * y la columna deja de leerse de un vistazo — que es lo único que José
 * hace con esta aplicación.
 */
export function Cifra({
  valor,
  unidad,
  tono = 'neutro',
  tamano = 'md',
  atenuado = false,
  className,
}: CifraProps) {
  return (
    <span className={cn('num inline-flex items-baseline gap-1', className)}>
      <span className={cn(tamanos[tamano], atenuado ? 'text-hormigon-500' : textoPorTono[tono])}>
        {valor}
      </span>
      {unidad ? (
        <span className="text-hormigon-500 text-[0.75em] font-medium">{unidad}</span>
      ) : null}
    </span>
  );
}
