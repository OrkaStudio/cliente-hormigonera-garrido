'use client';

import { useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

import { Segmentado } from '@/components/dominio/segmentado';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emitirDocumento, proximoNumero } from '@/lib/datos/documentos-locales';
import { precioSugerido } from '@/lib/datos/semilla';
import type { Carga, Cliente } from '@/lib/datos/tipos';
import { ROTULO, type LineaDocumento, type TipoDocumento } from '@/lib/dominio/documentos';
import { $, num } from '@/lib/formato';

/** Cuántos días vale un presupuesto si nadie dice otra cosa. */
const DIAS_VALIDEZ = 7;

function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

/**
 * Emitir un papel para un cliente.
 *
 * Sirve para los tres tipos. Cambia qué se pide, no cómo:
 *
 *  - Presupuesto: no sale de ninguna carga. Se cargan las líneas a mano
 *    y **lleva fecha de vencimiento obligatoria** — con esta inflación,
 *    un presupuesto sin fecha es una promesa que no se puede cumplir.
 *  - Remito valorizado: sale de una carga ya asignada. Los datos ya
 *    están; sólo se confirma.
 *  - Remito de entrega: lo mismo, pero sin un solo precio en la hoja.
 *    Es el que va con el chofer.
 */
export function DialogoDocumento({
  abierto,
  onCerrar,
  cliente,
  carga,
  tipo,
}: {
  abierto: boolean;
  onCerrar: () => void;
  cliente: Cliente;
  /** Presente en los remitos, ausente en el presupuesto. */
  carga?: Carga | null;
  tipo: TipoDocumento;
}) {
  const router = useRouter();
  // Con precios o sin precios se elige acá adentro y no con dos botones
  // en la fila: es la misma accion, cambia que sale impreso.
  const [conPrecios, setConPrecios] = useState(true);
  const [lineas, setLineas] = useState<LineaDocumento[]>([]);
  const [validez, setValidez] = useState(String(DIAS_VALIDEZ));
  const [notas, setNotas] = useState('');

  // Se arma al abrir: si se calculara en el render, escribir en un campo
  // reiniciaria las lineas en cada tecla.
  const [armado, setArmado] = useState(false);
  if (abierto && !armado) {
    setArmado(true);
    setLineas(
      carga
        ? [
            {
              detalle: `Hormigón elaborado ${carga.receta}`,
              cantidad: carga.m3,
              unidad: 'm³',
                      precioUnitario: Math.round(carga.total / carga.m3),
            },
          ]
        : [{ detalle: 'Hormigón elaborado H-21', cantidad: 6, unidad: 'm³', precioUnitario: precioSugerido('H-21', 1) }],
    );
  }
  if (!abierto && armado) setArmado(false);

  const esPresupuesto = tipo === 'presupuesto';
  const tipoFinal: TipoDocumento = esPresupuesto
    ? 'presupuesto'
    : conPrecios
      ? 'remito'
      : 'remito-sin-valores';
  const conValores = tipoFinal !== 'remito-sin-valores';
  const total = lineas.reduce((a, l) => a + l.cantidad * (l.precioUnitario ?? 0), 0);
  const valido = lineas.length > 0 && lineas.every((l) => l.detalle.trim() && l.cantidad > 0);

  function cambiar(i: number, parche: Partial<LineaDocumento>) {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parche } : l)));
  }

  function emitir() {
    const doc = emitirDocumento({
      tipo: tipoFinal,
      // El remito de entrega no lleva precio EN NINGUNA PARTE. Es el que
      // va con el chofer: que el numero no llegue a la obra es la razon
      // de que exista este tipo.
      lineas: conValores ? lineas : lineas.map((l) => ({ ...l, precioUnitario: null })),
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteCuit: cliente.cuit,
      clienteDireccion: cliente.direccion,
      ...(esPresupuesto ? { validoHasta: enDias(Number(validez) || DIAS_VALIDEZ) } : {}),
      ...(carga ? { cargaId: carga.id } : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    });
    onCerrar();
    // typedRoutes no puede validar una ruta armada en runtime.
    router.push(`/documentos/${doc.numero}` as Route);
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ROTULO[tipoFinal]} para {cliente.nombre}
          </DialogTitle>
          <DialogDescription>
            Va a salir con el número {proximoNumero()}.{' '}
            {conValores
              ? 'Los precios que pongas acá son los que quedan impresos.'
              : 'Esta hoja no lleva ningún precio: es la que va con el chofer.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!esPresupuesto && (
            <Segmentado
              valor={conPrecios ? 'con' : 'sin'}
              onCambio={(v) => setConPrecios(v === 'con')}
              opciones={[
                { valor: 'con', etiqueta: 'Con precios' },
                { valor: 'sin', etiqueta: 'Sin precios' },
              ]}
            />
          )}

          {lineas.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                {i === 0 && <Label className="mb-1.5 block">Detalle</Label>}
                <Input
                  value={l.detalle}
                  onChange={(e) => cambiar(i, { detalle: e.target.value })}
                  placeholder="Hormigón elaborado H-21"
                />
              </div>

              <div className="w-20">
                {i === 0 && <Label className="mb-1.5 block">Cantidad</Label>}
                <Input
                  value={String(l.cantidad)}
                  onChange={(e) =>
                    cambiar(i, { cantidad: Number(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 })
                  }
                  inputMode="decimal"
                  className="text-right font-mono tabular-nums"
                />
              </div>

              {/* La unidad se edita: un flete no se mide en m3, y una
                  linea que dice "1,0 m3 de Flete" no significa nada. */}
              {esPresupuesto && (
                <div className="w-16">
                  {i === 0 && <Label className="mb-1.5 block">Unidad</Label>}
                  <Input
                    value={l.unidad}
                    onChange={(e) => cambiar(i, { unidad: e.target.value })}
                    className="font-mono"
                    aria-label={`Unidad de la línea ${i + 1}`}
                  />
                </div>
              )}

              {conValores && (
                <div className="w-32">
                  {i === 0 && <Label className="mb-1.5 block">Precio unit.</Label>}
                  <Input
                    value={num(l.precioUnitario ?? 0)}
                    onChange={(e) =>
                      cambiar(i, { precioUnitario: Number(e.target.value.replace(/\D/g, '')) || 0 })
                    }
                    inputMode="numeric"
                    className="text-right font-mono tabular-nums"
                  />
                </div>
              )}

              {/* Sólo el presupuesto arma líneas: un remito describe una
                  carga concreta y no se le agregan renglones inventados. */}
              {esPresupuesto && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                  disabled={lineas.length === 1}
                  aria-label={`Quitar la línea ${i + 1}`}
                  title="Quitar"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}

          {esPresupuesto && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLineas((ls) => [
                  ...ls,
                  // Sin unidad ni precio puestos: que el que carga los
                  // decida, en vez de heredar un "1,0 m³ · $ 0" que nadie
                  // tipeo y termina impreso.
                  { detalle: '', cantidad: 1, unidad: 'un', precioUnitario: 0 },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Agregar línea
            </Button>
          )}

          {esPresupuesto && (
            <div className="border-line mt-2 border-t pt-3">
              <Label htmlFor="validez">Vale por</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  id="validez"
                  value={validez}
                  onChange={(e) => setValidez(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="w-20 text-right font-mono tabular-nums"
                />
                <span className="text-ink-soft text-sm">días</span>
              </div>
              <p className="text-faint mt-1.5 text-xs">
                Va impreso en el presupuesto. Con la inflación de hoy, un precio sin fecha de
                vencimiento es una promesa que no se puede cumplir.
              </p>
            </div>
          )}

          <div className="border-line flex items-baseline justify-between border-t pt-3">
            <Label htmlFor="notas-doc" className="text-muted-foreground">
              Notas (opcional)
            </Label>
            {conValores && (
              <span className="font-mono text-base font-semibold tabular-nums">{$(total)}</span>
            )}
          </div>
          <Input
            id="notas-doc"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Entrega en obra, forma de pago, lo que haga falta"
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button onClick={emitir} disabled={!valido}>
            Emitir y ver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
