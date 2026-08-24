import { $ } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Cuánto de una venta se facturó, dibujado.
 *
 * Blanco y negro son literales: el segmento claro es lo que se facturó y
 * el oscuro lo que no. Antes esto era un chip que decía "53%", y un 53%
 * se leía igual que un 100% — había que leer el número para saber si la
 * venta estaba entera o partida al medio. Dibujada, la diferencia salta
 * sin leer.
 *
 * El borde no es decorativo: sin él, el segmento blanco desaparece sobre
 * una tarjeta blanca.
 */
export function BarraFiscal({
  blanco,
  negro,
  className,
}: {
  blanco: number;
  negro: number;
  className?: string;
}) {
  const total = blanco + negro;
  if (total <= 0) return null;

  return (
    <span
      className={cn('border-line flex h-2 overflow-hidden rounded-full border', className)}
      role="img"
      aria-label={`${$(blanco)} facturado de ${$(total)}`}
    >
      <span className="bg-paper" style={{ width: `${(blanco / total) * 100}%` }} />
      <span className="bg-ink" style={{ width: `${(negro / total) * 100}%` }} />
    </span>
  );
}
