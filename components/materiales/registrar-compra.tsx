'use client';

import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { registrarCompra } from '@/lib/datos/compras-locales';
import { altaProveedor } from '@/lib/datos/proveedores-locales';
import type { Compra, Proveedor } from '@/lib/datos/tipos';
import { $, dec, num } from '@/lib/formato';

/**
 * Cargar una compra — apartado 6.
 *
 * El criterio de terminado dice "menos de un minuto": se elige a quién se
 * le compró, cuánto y a cuánto, y listo. La unidad no se pregunta — se
 * compra en toneladas o en m³ y la app convierte sola (R1).
 *
 * ── Por qué el proveedor SE ELIGE ──────────────────────────────────────
 * La primera versión lo ataba 1 a 1 al material y no se podía cambiar.
 * Está mal: a cualquiera se le puede comprar cualquier cosa, y el flujo
 * de la spec lo dice desde el 18/08 — "elige proveedor → ¿existe? → no →
 * alta rápida: nombre y teléfono". Se propone el último que trajo ESE
 * material, que es lo más probable, y se puede pisar.
 *
 * Se abre al lado del material y no en una pantalla aparte: cargar la
 * compra donde se ve que falta es lo que hace que se cargue.
 */
export function RegistrarCompra({
  material,
  unidadCompra,
  unidadPlanta,
  factorConversion,
  proveedores,
  sugerido,
  ultima,
  entran,
  restante,
  capacidad,
  onCompra,
  onProveedor,
}: {
  material: string;
  unidadCompra: string;
  unidadPlanta: string;
  factorConversion: number;
  /** Todos los que existen: a cualquiera se le puede comprar cualquier cosa. */
  proveedores: Proveedor[];
  /** El que trajo este material la última vez. Se propone, no se impone. */
  sugerido: Proveedor | null;
  /** Para proponer el precio: casi siempre es el del camión anterior. */
  ultima: Compra | null;
  /** Lo que ENTRA sin pasarse de la capacidad (R6). Manda sobre `ultima`. */
  entran: number | null;
  restante: number;
  capacidad: number | null;
  onCompra: (compras: Compra[]) => void;
  onProveedor: (proveedores: Proveedor[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [proveedorId, setProveedorId] = useState<string | null>(sugerido?.id ?? null);
  /*
   * Se propone lo que ENTRA, no lo que se compró la vez pasada. Con la
   * cantidad del camión anterior se desbordaba el silo: 334 m³ sobre
   * 68.279 de áridos daban 602.679 en un playón de 600.000 (R6).
   */
  const [cantidad, setCantidad] = useState(String(entran ?? ultima?.cantidad ?? ''));
  const [precio, setPrecio] = useState(String(ultima?.precioUnitario ?? ''));
  const [remito, setRemito] = useState('');

  // El alta rápida, adentro del mismo formulario: si hay que irse a otra
  // pantalla a dar de alta al proveedor, la compra no se carga.
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  const nCantidad = Number(cantidad);
  const nPrecio = Number(precio);
  const valido = nCantidad > 0 && nPrecio > 0 && proveedorId !== null;
  const convertida = nCantidad * factorConversion;
  /* No se bloquea: puede haber acopio afuera del silo, y rechazar una
     compra que de verdad entró haría mentir al stock. Se avisa. */
  const desborda = capacidad !== null && restante + convertida > capacidad;

  /* El que ya trajo este material primero: es el más probable. */
  const ordenados = [...proveedores].sort(
    (a, b) =>
      Number(b.provee.includes(material)) - Number(a.provee.includes(material)) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );

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
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
        <Campo rotulo="Se le compró a">
          {nuevo ? (
            <span className="flex flex-wrap items-center gap-2">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
                className="w-44"
                aria-label="Nombre del proveedor nuevo"
                autoFocus
              />
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono"
                className="w-40"
                aria-label="Teléfono del proveedor nuevo"
              />
              <Button
                variant="secondary"
                disabled={nombre.trim() === ''}
                onClick={() => {
                  const todos = altaProveedor(nombre, telefono, [material]);
                  onProveedor(todos);
                  setProveedorId(todos[todos.length - 1]!.id);
                  setNuevo(false);
                  setNombre('');
                  setTelefono('');
                }}
              >
                Agregar
              </Button>
              <button
                type="button"
                onClick={() => setNuevo(false)}
                className="text-muted-foreground hover:text-ink text-sm underline-offset-2 hover:underline"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Select value={proveedorId} onValueChange={(v) => setProveedorId(v as string)}>
                <SelectTrigger className="w-52" aria-label={`Proveedor de la compra de ${material}`}>
                  {/* El rótulo se arma del id y no del ítem seleccionado:
                      al dar de alta uno nuevo, el ítem todavía no está
                      registrado en la lista y el trigger mostraba el id
                      pelado ("PR-MTJ3WE69"). */}
                  <SelectValue placeholder="Elegir proveedor…">
                    {(id) =>
                      proveedores.find((p) => p.id === id)?.nombre ??
                      ordenados.find((p) => p.id === id)?.nombre ??
                      'Elegir proveedor…'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ordenados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                      {p.provee.includes(material) && ' · ya le trajo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setNuevo(true)}
                className="text-muted-foreground hover:text-ink inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
              >
                <Plus className="size-3.5" aria-hidden />
                Nuevo
              </button>
            </span>
          )}
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
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
                proveedorId: proveedorId!,
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

      {valido && desborda && (
        <p className="text-warn-text mt-2 text-xs">
          Con esto quedan <span className="num">{num(restante + convertida)}</span>{' '}
          {unidadPlanta} y la capacidad es <span className="num">{num(capacidad!)}</span>:
          entran <span className="num">{num(entran ?? 0)}</span> {unidadCompra}.
        </p>
      )}

      {/* La conversión a la vista: se compra en toneladas y el silo se
          cuenta en kilos, y ese salto es donde el stock se rompe (R1). */}
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
