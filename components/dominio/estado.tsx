import type { Carga } from '@/lib/datos/tipos';
import { condicionFiscal, pesosDe, porcentajeFacturado } from '@/lib/dominio/fiscal';
import { $ } from '@/lib/formato';
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
 * De que lado cae una venta.
 *
 * No calculamos nada fiscal — decision tomada y asentada en
 * decisiones/hormigonera-plataforma-sin-fiscal. Solo marcamos de que
 * lado cae cada venta y lo mostramos separado; el analisis es de ellos.
 * Por eso esto es una marca visual, deliberadamente sin color de estado:
 * que una venta sea en negro no es un error ni una alarma.
 *
 * El caso `parcial` no es un tercer estado inventado: es lo que pasa de
 * verdad cuando se factura una parte de la venta y el resto no. Se
 * muestra el porcentaje, porque "Parcial" a secas no dice si fue el 5%
 * o el 95%. El monto exacto va en el `title`, que en la oficina se ve
 * al pasar el mouse por encima.
 */
export function MarcaFiscal({
  tipo,
  porcentaje,
  detalle,
}: {
  tipo: 'blanco' | 'negro' | 'parcial';
  /** Solo para `parcial`: cuanto del total se facturo. */
  porcentaje?: number | null;
  /** Texto del tooltip, con los pesos de los dos lados. */
  detalle?: string;
}) {
  if (tipo === 'parcial') {
    return (
      <span
        title={detalle}
        aria-label={porcentaje == null ? 'Facturada en parte' : `${porcentaje}% en blanco`}
        className="border-ink text-ink inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      >
        {/* El punto se llena en la misma proporcion que el numero: asi el
            badge dice de que lado cae el porcentaje sin gastar una
            palabra. Blanco a la izquierda, como en la barra del perfil. */}
        <span
          aria-hidden
          className="border-ink size-2 shrink-0 rounded-full border bg-white"
          style={{
            background: `linear-gradient(90deg, #fff ${porcentaje ?? 50}%, currentColor ${porcentaje ?? 50}%)`,
          }}
        />
        {porcentaje == null ? 'Parcial' : `${porcentaje}%`}
      </span>
    );
  }

  return (
    <span
      title={detalle}
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

/**
 * La marca fiscal de una venta concreta, con el monto ya derivado.
 *
 * Existe para que ninguna pantalla vuelva a decidir por su cuenta que
 * es blanco y que es negro: la regla vive en `condicionFiscal()` y aca
 * solo se dibuja. Devuelve null si la venta no tiene el corte definido
 * — el que llama decide que poner en ese hueco.
 */
export function MarcaFiscalDeVenta({ venta }: { venta: Pick<Carga, 'total' | 'montoFacturado'> }) {
  const tipo = condicionFiscal(venta);
  if (tipo === null) return null;

  const p = pesosDe(venta)!;
  const detalle =
    tipo === 'blanco'
      ? `Facturado entero: ${$(p.blanco)}`
      : tipo === 'negro'
        ? `Sin facturar: ${$(p.negro)}`
        : `Facturado ${$(p.blanco)} de ${$(venta.total)} — quedan ${$(p.negro)} sin facturar`;

  return <MarcaFiscal tipo={tipo} porcentaje={porcentajeFacturado(venta)} detalle={detalle} />;
}
