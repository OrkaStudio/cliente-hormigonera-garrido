'use client';

import { useState } from 'react';
import { PackageCheck } from 'lucide-react';

import { Cifra } from '@/components/dominio/cifra';
import { MuestraReceta } from '@/components/dominio/etiqueta-receta';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Carga, Pedido } from '@/lib/datos/tipos';
import { avanceDe, candidatosPara } from '@/lib/dominio/pedidos';
import { $, dec, hora } from '@/lib/formato';

/**
 * Imputar un pastón a un pedido.
 *
 * Reemplaza al "asignar cliente y tipear el precio". El pedido ya trae
 * las dos cosas: el cliente que lo encargó y el precio que se acordó al
 * tomarlo. Antes había que escribir el monto en cada pastón — treinta y
 * nueve veces por mes → decisiones/hormigonera-el-pedido-es-la-venta
 *
 * Los candidatos salen ordenados por el que más cerca está de
 * completarse: si a un pedido le falta justo este volumen, es el más
 * probable. Es una SUGERENCIA, no una imputación automática — el
 * registro que llega del autómata no trae el pedido, así que deducirlo
 * sería adivinar.
 */
export function ImputarCargas({
  cargas,
  pedidos,
  todasLasCargas,
  nombresDeCliente,
  recetas,
  onImputar,
}: {
  cargas: Carga[];
  pedidos: Pedido[];
  /** Para saber cuánto le falta a cada pedido. */
  todasLasCargas: Carga[];
  nombresDeCliente: Record<string, string>;
  recetas: string[];
  onImputar: (carga: Carga, pedido: Pedido) => void;
}) {
  return (
    <div className="grid gap-2">
      {cargas.map((c) => (
        <FilaImputar
          key={c.id}
          carga={c}
          candidatos={candidatosPara(c, pedidos, todasLasCargas)}
          todasLasCargas={todasLasCargas}
          nombresDeCliente={nombresDeCliente}
          recetas={recetas}
          onImputar={onImputar}
        />
      ))}
    </div>
  );
}

function FilaImputar({
  carga,
  candidatos,
  todasLasCargas,
  nombresDeCliente,
  recetas,
  onImputar,
}: {
  carga: Carga;
  candidatos: Pedido[];
  todasLasCargas: Carga[];
  nombresDeCliente: Record<string, string>;
  recetas: string[];
  onImputar: (carga: Carga, pedido: Pedido) => void;
}) {
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const elegido = candidatos.find((p) => p.id === pedidoId) ?? null;

  return (
    <div className="border-line bg-card flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4 rounded-lg border p-3">
      <Campo rotulo="Carga">
        <span className="num text-sm font-medium">{carga.id}</span>
      </Campo>
      <Campo rotulo="Hora fin">
        <span className="num text-sm">{hora(carga.momento)}</span>
      </Campo>
      <Campo rotulo="Receta">
        <span className="flex items-center gap-2">
          <MuestraReceta receta={carga.receta} recetas={recetas} />
          <span className="num text-sm">{carga.receta}</span>
        </span>
      </Campo>
      <Campo rotulo="Volumen">
        <Cifra valor={dec(carga.m3)} unidad="m³" tamano="sm" />
      </Campo>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
        {candidatos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay ningún pedido abierto de {carga.receta} al que le falte volumen. Primero se
            toma el pedido.
          </p>
        ) : (
          <>
            <Select value={pedidoId} onValueChange={(v) => setPedidoId(v as string)}>
              <SelectTrigger
                className="w-full min-w-0 sm:w-auto sm:flex-1"
                aria-label={`Pedido para la carga ${carga.id}`}
              >
                <SelectValue placeholder="Imputar a pedido…" />
              </SelectTrigger>
              <SelectContent>
                {candidatos.map((p) => {
                  const falta = avanceDe(p, todasLasCargas).pendiente;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} · {nombresDeCliente[p.clienteId] ?? p.clienteId} · faltan{' '}
                      {dec(falta)} m³
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* El precio NO se tipea: sale del pedido. */}
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {elegido ? (
                <>
                  <span className="num text-ink">
                    {$(Math.round(carga.m3 * elegido.precioM3))}
                  </span>
                  <span className="text-faint"> al precio del pedido</span>
                </>
              ) : (
                <span className="text-faint">el precio sale del pedido</span>
              )}
            </span>

            <Button disabled={!elegido} onClick={() => elegido && onImputar(carga, elegido)}>
              <PackageCheck data-icon="inline-start" />
              Imputar
            </Button>
          </>
        )}
      </div>
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
