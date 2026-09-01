'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registrarCompra } from '@/lib/datos/compras-locales';
import type { Compra, Proveedor } from '@/lib/datos/tipos';
import { $, dec, num } from '@/lib/formato';

/**
 * Cargar una compra — apartado 6.
 *
 * El criterio de terminado dice "menos de un minuto", así que son tres
 * campos y nada más: cuánto, a cuánto, y el número de remito. El
 * proveedor no se elige porque hay uno solo por material, y la unidad
 * tampoco: se compra en toneladas o en m³ y la app convierte sola (R1).
 *
 * Se abre al lado del material y no en una pantalla aparte: cargar la
 * compra donde se ve que falta es lo que hace que se cargue.
 */
export function RegistrarCompra({
  material,
  unidadCompra,
  unidadPlanta,
  factorConversion,
  proveedor,
  ultima,
  entran,
  restante,
  capacidad,
  onCompra,
}: {
  material: string;
  unidadCompra: string;
  unidadPlanta: string;
  factorConversion: number;
  proveedor: Proveedor | null;
  /** Para proponer el precio: casi siempre es el del camión anterior. */
  ultima: Compra | null;
  /** Lo que ENTRA sin pasarse de la capacidad (R6). Manda sobre `ultima`. */
  entran: number | null;
  restante: number;
  capacidad: number | null;
  onCompra: (compras: Compra[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  /*
   * Se propone lo que ENTRA, no lo que se compró la vez pasada.
   *
   * Con la cantidad del camión anterior se desbordaba el silo: 334 m³
   * sobre 68.279 de áridos daban 602.679 en un playón de 600.000. R6 del
   * apartado 6: la sugerencia respeta la capacidad.
   */
  const [cantidad, setCantidad] = useState(String(entran ?? ultima?.cantidad ?? ''));
  const [precio, setPrecio] = useState(String(ultima?.precioUnitario ?? ''));
  const [remito, setRemito] = useState('');

  const nCantidad = Number(cantidad);
  const nPrecio = Number(precio);
  const valido = nCantidad > 0 && nPrecio > 0 && proveedor !== null;
  const convertida = nCantidad * factorConversion;
  /* No se bloquea: puede haber acopio afuera del silo, y rechazar una
     compra que de verdad entró haría mentir al stock. Se avisa. */
  const desborda = capacidad !== null && restante + convertida > capacidad;

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-muted-foreground hover:text-ink focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        <Truck className="size-3.5" aria-hidden />
        Cargar compra
      </button>
    );
  }

  return (
    <div className="border-line bg-card mt-2 w-full rounded-lg border p-3">
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        Entró {material}
        {proveedor && <span className="tracking-normal normal-case"> · {proveedor.nombre}</span>}
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
        <Campo rotulo={`Cantidad (${unidadCompra})`}>
          <Input
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            className="w-24 text-right font-mono tabular-nums"
            aria-label={`Cantidad de ${material} en ${unidadCompra}`}
          />
        </Campo>

        <Campo rotulo={`Precio por ${unidadCompra}`}>
          <Input
            value={precio}
            onChange={(e) => setPrecio(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            className="w-32 text-right font-mono tabular-nums"
            aria-label={`Precio por ${unidadCompra} de ${material}`}
          />
        </Campo>

        <Campo rotulo="N° de remito">
          <Input
            value={remito}
            onChange={(e) => setRemito(e.target.value)}
            className="w-32"
            placeholder="opcional"
            aria-label={`Número de remito de la compra de ${material}`}
          />
        </Campo>

        <Button
          disabled={!valido}
          onClick={() => {
            onCompra(
              registrarCompra({
                proveedorId: proveedor!.id,
                material,
                cantidad: nCantidad,
                unidadCompra,
                cantidadConvertida: convertida,
                precioUnitario: nPrecio,
                total: nPrecio * nCantidad,
                remito: remito.trim() || null,
              }),
            );
            setAbierto(false);
            setRemito('');
          }}
        >
          Cargar
        </Button>

        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-muted-foreground hover:text-ink text-sm underline-offset-2 hover:underline"
        >
          Cancelar
        </button>
      </div>

      {/* La conversión a la vista: se compra en toneladas y el silo se
          cuenta en kilos, y ese salto es donde el stock se rompe (R1). */}
      {valido && desborda && (
        <p className="text-warn-text mt-2 text-xs">
          Con esto quedan <span className="num">{num(restante + convertida)}</span>{' '}
          {unidadPlanta} y la capacidad es{' '}
          <span className="num">{num(capacidad!)}</span>: entran{' '}
          <span className="num">{num(entran ?? 0)}</span> {unidadCompra}.
        </p>
      )}

      {valido && (
        <p className="text-faint mt-2 text-xs">
          Suma <span className="num text-ink-soft">{num(convertida)} {unidadPlanta}</span> al
          silo · total <span className="num text-ink-soft">{$(nPrecio * nCantidad)}</span> ·{' '}
          <span className="num">
            {nPrecio / factorConversion < 100
              ? `$ ${dec(nPrecio / factorConversion)}`
              : $(Math.round(nPrecio / factorConversion))}
          </span>
          /{unidadPlanta}
        </p>
      )}
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <span className="grid gap-1">
      <span className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        {rotulo}
      </span>
      {children}
    </span>
  );
}
