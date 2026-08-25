'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Cifra } from '@/components/dominio/cifra';
import { EtiquetaReceta } from '@/components/dominio/etiqueta-receta';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClienteAsignable } from '@/lib/datos/inicio';
import { precioSugerido } from '@/lib/datos/semilla';
import type { Carga } from '@/lib/datos/tipos';
import { $, dec, fechaDeMomento, hora, num } from '@/lib/formato';

/**
 * Asignarle el cliente a una carga que salio de la planta sin dueno.
 *
 * Vive adentro de la alerta de Inicio y no en una pantalla aparte porque
 * es donde el problema se ve: la R2 de la spec pide que toda alerta lleve
 * a resolverse, y hasta ahora esta solo mostraba cuales eran.
 *
 * ── Por que tambien pide el precio ─────────────────────────────────────
 * Una carga sin cliente vale $0. Si al asignarla no se le pone precio, la
 * venta nace en cero: no suma al facturado, no tiene margen y el
 * comprobante sale vacio. Asignar sin precio no termina el trabajo.
 *
 * Se propone el de la receta y se deja editar, porque el que vale es el
 * que Jose cobro — un descuento, un flete bonificado, un precio viejo que
 * ya estaba hablado. Y una vez guardado NO SE RECALCULA: es la regla dura
 * del proyecto (decisiones/hormigonera-precio-en-la-venta).
 *
 * ── Por que NO pide blanco o negro ─────────────────────────────────────
 * Asignar el cliente y decidir cuanto se factura son dos momentos
 * distintos. Cuando sale el paston se sabe para quien es; que pasa con el
 * papel se decide despues, al emitir el documento. Marcarlo acá seria
 * inventarle a Jose una decision que todavia no tomo, y por eso
 * `montoFacturado` queda en null.
 */
export function AsignarCargas({
  cargas,
  clientes,
  onAsignar,
  formato = 'compacta',
  recetas,
}: {
  cargas: Carga[];
  clientes: ClienteAsignable[];
  onAsignar: (cargaId: string, clienteId: string, total: number) => void;
  /**
   * "compacta" es la de Inicio, donde esto vive adentro de una alerta y
   * pelea por lugar. "detallada" es la de Cargas, donde es el sujeto de
   * la pantalla y cada dato lleva su rótulo arriba.
   */
  formato?: 'compacta' | 'detallada';
  /** Para el color de la etiqueta de receta. Sólo en formato detallado. */
  recetas?: string[];
}) {
  // El generico primero: es el destino mas probable de una carga que
  // salio sin dueno — la venta suelta que nadie anoto.
  const ordenados = [...clientes].sort(
    (a, b) => Number(b.generico) - Number(a.generico) || a.nombre.localeCompare(b.nombre, 'es'),
  );

  if (cargas.length === 0) {
    return (
      <p className="text-ok-text flex items-center gap-2 py-1 text-sm">
        <Check className="size-4 shrink-0" aria-hidden />
        Todas las cargas tienen cliente.
      </p>
    );
  }

  if (formato === 'detallada') {
    return (
      <div className="grid gap-2">
        {cargas.map((c) => (
          <FilaAsignarDetallada
            key={c.id}
            carga={c}
            clientes={ordenados}
            onAsignar={onAsignar}
            recetas={recetas ?? []}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-line/70 divide-y">
      {cargas.map((c) => (
        <FilaAsignar key={c.id} carga={c} clientes={ordenados} onAsignar={onAsignar} />
      ))}
    </div>
  );
}

/**
 * La fila con cada dato rotulado.
 *
 * En Cargas esto no es una alerta al costado: es lo primero que hay que
 * resolver. "16:54 · 6 m³ H-25" obligaba a adivinar qué era cada número;
 * acá cada uno dice qué es.
 */
function FilaAsignarDetallada({
  carga,
  clientes,
  onAsignar,
  recetas,
}: {
  carga: Carga;
  clientes: ClienteAsignable[];
  onAsignar: (cargaId: string, clienteId: string, total: number) => void;
  recetas: string[];
}) {
  const sugerido = precioSugerido(carga.receta, carga.m3);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [digitos, setDigitos] = useState(String(sugerido));
  const [escribiendo, setEscribiendo] = useState(false);

  const monto = Number(digitos);
  const precioValido = Number.isFinite(monto) && monto > 0;
  const listo = clienteId !== null && precioValido;

  return (
    <div className="border-line bg-card flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4 rounded-lg border p-3">
      <Campo rotulo="Carga">
        <span className="num text-sm font-semibold">{carga.id}</span>
      </Campo>
      <Campo rotulo="Hora fin">
        <span className="num text-sm">{hora(carga.momento)}</span>
      </Campo>
      <Campo rotulo="Receta">
        <EtiquetaReceta receta={carga.receta} recetas={recetas} />
      </Campo>
      <Campo rotulo="Volumen">
        <Cifra valor={dec(carga.m3)} unidad="m³" tamano="md" />
      </Campo>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
        <Select value={clienteId} onValueChange={(v) => setClienteId(v as string)}>
          <SelectTrigger
            className="w-full min-w-0 sm:w-auto sm:flex-1"
            aria-label={`Cliente para la carga ${carga.id}`}
          >
            <SelectValue placeholder="Asignar a cliente…" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((cl) => (
              <SelectItem key={cl.id} value={cl.id}>
                {cl.nombre}
                {cl.generico && ' · venta suelta'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="flex items-center gap-1.5">
          <span className="text-faint text-sm">$</span>
          <Input
            value={escribiendo ? digitos : num(monto || 0)}
            onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ''))}
            onFocus={() => setEscribiendo(true)}
            onBlur={() => setEscribiendo(false)}
            inputMode="numeric"
            className="w-28 text-right font-mono tabular-nums"
            aria-label={`Precio de la carga ${carga.id}`}
            aria-invalid={!precioValido}
            title={`Sugerido por la receta ${carga.receta}: ${$(sugerido)}. El que vale es el que se cobró.`}
          />
        </span>

        <Button
          disabled={!listo}
          onClick={() => onAsignar(carga.id, clienteId!, Math.round(monto))}
        >
          Asignar
        </Button>
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

function FilaAsignar({
  carga,
  clientes,
  onAsignar,
}: {
  carga: Carga;
  clientes: ClienteAsignable[];
  onAsignar: (cargaId: string, clienteId: string, total: number) => void;
}) {
  const sugerido = precioSugerido(carga.receta, carga.m3);
  const [clienteId, setClienteId] = useState<string | null>(null);
  // Se guardan los digitos pelados y se muestran con separador de miles
  // salvo mientras se escribe. Reformatear en cada tecla manda el cursor
  // al final y hace imposible corregir un digito del medio.
  const [digitos, setDigitos] = useState(String(sugerido));
  const [escribiendo, setEscribiendo] = useState(false);

  const monto = Number(digitos);
  const precioValido = Number.isFinite(monto) && monto > 0;
  const listo = clienteId !== null && precioValido;
  const esHoy = new Date(carga.momento).toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <span className="text-ink-soft w-28 shrink-0 font-mono text-xs tabular-nums">
        {!esHoy && <span className="text-faint mr-1">{fechaDeMomento(carga.momento)}</span>}
        {hora(carga.momento)}
      </span>

      <span className="text-ink-soft w-28 shrink-0 text-sm">
        {carga.m3} m³ <span className="text-faint font-mono text-xs">{carga.receta}</span>
      </span>

      <Select value={clienteId} onValueChange={(v) => setClienteId(v as string)}>
        <SelectTrigger
          className="w-full min-w-48 sm:w-56"
          aria-label={`Cliente para la carga de las ${hora(carga.momento)}`}
        >
          <SelectValue placeholder="Elegir cliente" />
        </SelectTrigger>
        <SelectContent>
          {clientes.map((cl) => (
            <SelectItem key={cl.id} value={cl.id}>
              {cl.nombre}
              {cl.generico && ' · venta suelta'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <span className="text-faint text-sm">$</span>
        <Input
          value={escribiendo ? digitos : num(monto || 0)}
          onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ''))}
          onFocus={() => setEscribiendo(true)}
          onBlur={() => setEscribiendo(false)}
          inputMode="numeric"
          className="w-28 text-right font-mono tabular-nums"
          aria-label={`Precio de la carga de las ${hora(carga.momento)}`}
          aria-invalid={!precioValido}
          title={`Sugerido por la receta ${carga.receta}: ${$(sugerido)}. El que vale es el que se cobró.`}
        />
      </div>

      <Button
        size="sm"
        disabled={!listo}
        onClick={() => onAsignar(carga.id, clienteId!, Math.round(monto))}
      >
        Asignar
      </Button>
    </div>
  );
}
