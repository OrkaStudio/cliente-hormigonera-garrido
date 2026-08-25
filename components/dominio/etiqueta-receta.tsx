import { colorDeReceta } from '@/lib/dominio/cargas';
import { cn } from '@/lib/utils';

/**
 * La receta, con su color.
 *
 * Son tres y son fijas, así que el color es identidad —como el color de
 * una marca— y no un estado. Por eso puede usar la serie de datos: la
 * serie existe justamente para distinguir categorías sin pisar el
 * semáforo.
 *
 * El relleno usa la variante `-relleno`, apenas más oscura, porque con
 * los valores de la serie el texto blanco sobre el ámbar da 3,57:1 y
 * sobre el verde 4,32:1 — los dos por debajo del 4,5 que pide un texto
 * de este tamaño. Las barras y los cuadrados siguen con la serie
 * original: un objeto gráfico sólo necesita 3:1.
 *
 * Las clases van escritas enteras porque Tailwind escanea el código
 * buscando nombres literales: un `bg-${color}` armado en tiempo de
 * ejecución nunca aparece y el CSS no se genera.
 */
const RELLENO = {
  s1: 'bg-s1-relleno',
  s2: 'bg-s2-relleno',
  s3: 'bg-s3-relleno',
  s4: 'bg-s4-relleno',
} as const;

const MUESTRA = {
  s1: 'bg-s1',
  s2: 'bg-s2',
  s3: 'bg-s3',
  s4: 'bg-s4',
} as const;

export function EtiquetaReceta({
  receta,
  recetas,
  className,
}: {
  receta: string;
  recetas: string[];
  className?: string;
}) {
  const color = colorDeReceta(receta, recetas);

  return (
    <span
      className={cn(
        'num inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-xs font-semibold',
        color ? `${RELLENO[color]} text-on-accent` : 'bg-sunk text-ink',
        className,
      )}
    >
      {receta}
    </span>
  );
}

/** El mismo color, en cuadrado, para cuando la etiqueta sería demasiado. */
export function MuestraReceta({ receta, recetas }: { receta: string; recetas: string[] }) {
  const color = colorDeReceta(receta, recetas);
  return (
    <span
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-[3px]',
        color ? MUESTRA[color] : 'border-line-strong border',
      )}
      aria-hidden
    />
  );
}

/** El color de la serie para una barra o un relleno grande. */
export function fondoDeReceta(receta: string, recetas: string[]) {
  const color = colorDeReceta(receta, recetas);
  return color ? MUESTRA[color] : 'bg-faint';
}

/** El color en TEXTO. Usa la variante oscura: sobre blanco, la serie no llega. */
const TEXTO = {
  s1: 'text-s1-relleno',
  s2: 'text-s2-relleno',
  s3: 'text-s3-relleno',
  s4: 'text-s4-relleno',
} as const;

export function textoDeReceta(receta: string, recetas: string[]) {
  const color = colorDeReceta(receta, recetas);
  return color ? TEXTO[color] : 'text-faint';
}
