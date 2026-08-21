'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react';

import { HojaDocumento, type ZonaHoja } from '@/components/documentos/hoja';
import { Segmentado } from '@/components/dominio/segmentado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emitirDocumento, proximoNumero } from '@/lib/datos/documentos-locales';
import { precioSugerido } from '@/lib/datos/semilla';
import type { Carga, Cliente } from '@/lib/datos/tipos';
import {
  totalDe,
  type Documento,
  type LineaDocumento,
  type TipoDocumento,
} from '@/lib/dominio/documentos';
import { $, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** Cuántos días vale un presupuesto si nadie dice otra cosa. */
const DIAS_VALIDEZ = 7;

/**
 * Le da un pulso a la parte del papel que se acaba de tocar.
 *
 * La pantalla promete "todo lo que cambies acá se ve en el papel al
 * instante" y lo cumplía, pero en silencio: el ojo estaba en el
 * formulario y el papel cambiaba sin avisar. Esto dice dónde mirar.
 */
function usePulso() {
  const [zona, setZona] = useState<ZonaHoja | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcar = useCallback((z: ZonaHoja) => {
    setZona(z);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setZona(null), 900);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return [zona, marcar] as const;
}

function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

/**
 * Armar un documento viendo el papel.
 *
 * Antes esto era un diálogo: se llenaba a ciegas y recién al emitir se
 * veía qué había salido. Ahora la hoja está a la izquierda y se mueve
 * mientras se configura a la derecha — pedido de Fran, y además cierra
 * un agujero real: los tres errores que aparecieron en la primera
 * versión (la fecha sin año, "1,0 m³ de Flete", un `$ 0` que nadie
 * tipeó) los delató el papel, no el formulario.
 *
 * La vista previa NO es una maqueta aparte: es exactamente el mismo
 * `HojaDocumento` que se imprime. Si fuera otra cosa, podría mentir.
 */
export function EmisorDocumento({
  cliente,
  carga,
  tipoInicial,
}: {
  cliente: Cliente;
  carga: Carga | null;
  tipoInicial: TipoDocumento;
}) {
  const router = useRouter();
  const esPresupuesto = tipoInicial === 'presupuesto';

  const [conPrecios, setConPrecios] = useState(true);
  const [lineas, setLineas] = useState<LineaDocumento[]>(() =>
    carga
      ? [
          {
            detalle: `Hormigón elaborado ${carga.receta}`,
            cantidad: carga.m3,
            unidad: 'm³',
            precioUnitario: Math.round(carga.total / carga.m3),
          },
        ]
      : [
          {
            detalle: 'Hormigón elaborado H-21',
            cantidad: 6,
            unidad: 'm³',
            precioUnitario: precioSugerido('H-21', 1),
          },
        ],
  );
  const [obra, setObra] = useState('');
  const [km, setKm] = useState('');
  const [validez, setValidez] = useState(String(DIAS_VALIDEZ));
  const [notas, setNotas] = useState('');
  const [emitiendo, setEmitiendo] = useState(false);
  const [pulso, marcarPulso] = usePulso();

  /**
   * Cuando el documento sale de una carga, los datos ya vienen del PLC:
   * cliente, m³, receta y precio. No hay nada que completar, y abrir el
   * formulario entero invita a tocar lo que no hay que tocar — sobre todo
   * el precio. Se abre listo para emitir y editar es un acto deliberado.
   *
   * Un presupuesto se arma de cero, así que ahí sí arranca abierto.
   */
  const [editando, setEditando] = useState(!carga);

  const tipo: TipoDocumento = esPresupuesto
    ? 'presupuesto'
    : conPrecios
      ? 'remito'
      : 'remito-sin-valores';
  const conValores = tipo !== 'remito-sin-valores';

  /**
   * El borrador que se ve a la izquierda. Se arma en cada tecla, no se
   * guarda: mientras no se apriete Emitir, este papel no existe.
   *
   * El número es el que VA a salir. Se pide acá sólo para mostrarlo; el
   * definitivo lo asigna `emitirDocumento`, que es el único que escribe.
   */
  const borrador: Documento = useMemo(
    () => ({
      numero: proximoNumero(),
      tipo,
      emitido: new Date().toISOString(),
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteCuit: cliente.cuit,
      clienteDireccion: cliente.direccion,
      lineas: conValores ? lineas : lineas.map((l) => ({ ...l, precioUnitario: null })),
      obra: obra.trim() || null,
      distanciaKm: Number(km) || null,
      ...(esPresupuesto ? { validoHasta: enDias(Number(validez) || DIAS_VALIDEZ) } : {}),
      ...(carga ? { cargaId: carga.id } : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    }),
    [tipo, conValores, cliente, lineas, obra, km, validez, notas, carga, esPresupuesto],
  );

  const total = totalDe(borrador);
  const valido = lineas.length > 0 && lineas.every((l) => l.detalle.trim() && l.cantidad > 0);

  function cambiar(i: number, parche: Partial<LineaDocumento>) {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parche } : l)));
    // El precio mueve el total; el resto, el cuerpo de la tabla.
    marcarPulso('precioUnitario' in parche ? 'total' : 'lineas');
  }

  function emitir() {
    setEmitiendo(true);
    const { numero: _descartado, emitido: _tambien, ...datos } = borrador;
    const doc = emitirDocumento(datos);
    router.push(`/documentos/${doc.numero}` as Route);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6">
      <Link
        href={`/clientes/${cliente.id}`}
        className="text-faint hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        {cliente.nombre}
      </Link>

      {/* El papel primero en el orden del DOM: en el teléfono se ve lo
          que se está armando antes que los controles que lo arman.

          Manda el papel, no el formulario: José está mirando lo que le va
          a dar al cliente. Por eso la hoja tiene proporción y sombra de
          hoja, apoyada sobre un fondo hundido, y los controles quedan en
          una columna angosta al costado. */}
      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mesa-tecnica border-line rounded-2xl border p-4 sm:p-7 print:border-0 print:bg-transparent print:p-0">
          <div className="papel bg-paper mx-auto max-w-2xl overflow-hidden rounded-sm print:max-w-none print:rounded-none">
            <HojaDocumento doc={borrador} resaltar={pulso} />
          </div>
        </div>

        <aside className="grid content-start gap-4">
          {/* El título grande lo lleva el papel. Acá alcanza con el número
              que se va a usar. */}
          <p className="text-faint text-xs">
            Sale con el N°{' '}
            <span className="text-ink-soft font-mono tabular-nums">{borrador.numero}</span>
          </p>

          {/* LA decisión de esta pantalla, y la única que no se puede
              deshacer una vez impresa: si el papel lleva precios o no. Un
              remito con precios en manos del chofer equivocado muestra el
              precio preferencial de ese cliente. Por eso tiene su propia
              tarjeta y no es un campo más de la lista. */}
          {!esPresupuesto && (
            <section
              className={cn(
                'rounded-xl border p-4 transition-colors',
                conPrecios ? 'border-line bg-panel' : 'border-warn/40 bg-warn-soft',
              )}
            >
              <p className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Qué imprime
              </p>
              <Segmentado
                className="mt-2"
                valor={conPrecios ? 'con' : 'sin'}
                onCambio={(v) => {
                  setConPrecios(v === 'con');
                  marcarPulso('total');
                }}
                opciones={[
                  { valor: 'con', etiqueta: 'Con precios' },
                  { valor: 'sin', etiqueta: 'Sin precios' },
                ]}
              />
              <p
                className={cn(
                  'mt-2 text-xs',
                  conPrecios ? 'text-muted-foreground' : 'text-warn-text',
                )}
              >
                {conPrecios
                  ? 'Va con los importes. Es el que se le manda al cliente.'
                  : 'No lleva ni un peso impreso, y suma el pie de firma. Es el que va con el chofer.'}
              </p>
            </section>
          )}

          {editando ? (
            <>
              {/* Entrar a editar es un acto deliberado, salir también: sin
                  una salida explícita el panel se queda abierto para
                  siempre y nadie sabe si lo que tocó quedó tomado. No
                  guarda nada —el papel ya viene mostrando cada tecla— pero
                  cierra el paréntesis y devuelve la pantalla a su estado
                  de reposo. */}
              {carga && (
                <div className="border-line bg-panel flex items-center justify-between gap-3 rounded-xl border p-3">
                  <p className="text-muted-foreground text-xs">
                    Editando sobre la carga{' '}
                    <span className="text-ink-soft font-mono">{carga.id}</span>
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setEditando(false)}>
                    <Check data-icon="inline-start" />
                    Listo
                  </Button>
                </div>
              )}
            <section className="border-line bg-panel grid gap-3 rounded-xl border p-4">
              <p className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Detalle
              </p>

              {lineas.map((l, i) => (
                <div key={i} className="border-line bg-sunk/60 grid gap-2 rounded-lg border p-3">
                  <Input
                    value={l.detalle}
                    onChange={(e) => cambiar(i, { detalle: e.target.value })}
                    placeholder="Hormigón elaborado H-21"
                    aria-label={`Detalle de la línea ${i + 1}`}
                  />

                  <div className="flex items-end gap-2">
                    <div className="w-20">
                      <Label className="text-faint mb-1 block text-xs">Cantidad</Label>
                      <Input
                        value={String(l.cantidad)}
                        onChange={(e) =>
                          cambiar(i, {
                            cantidad:
                              Number(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                          })
                        }
                        inputMode="decimal"
                        className="text-right font-mono tabular-nums"
                        aria-label={`Cantidad de la línea ${i + 1}`}
                      />
                    </div>

                    <div className="w-16">
                      <Label className="text-faint mb-1 block text-xs">Unidad</Label>
                      <Input
                        value={l.unidad}
                        onChange={(e) => cambiar(i, { unidad: e.target.value })}
                        className="font-mono"
                        aria-label={`Unidad de la línea ${i + 1}`}
                      />
                    </div>

                    {conValores && (
                      <div className="flex-1">
                        <Label className="text-faint mb-1 block text-xs">Precio unit.</Label>
                        <Input
                          value={num(l.precioUnitario ?? 0)}
                          onChange={(e) =>
                            cambiar(i, {
                              precioUnitario: Number(e.target.value.replace(/\D/g, '')) || 0,
                            })
                          }
                          inputMode="numeric"
                          className="text-right font-mono tabular-nums"
                          aria-label={`Precio unitario de la línea ${i + 1}`}
                        />
                      </div>
                    )}

                    {lineas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                        aria-label={`Quitar la línea ${i + 1}`}
                        title="Quitar"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  setLineas((ls) => [
                    ...ls,
                    // Sin unidad de hormigón ni precio heredados: que los
                    // ponga el que carga, en vez de imprimir un "1,0 m³ ·
                    // $ 0" que nadie tipeó.
                    { detalle: '', cantidad: 1, unidad: 'un', precioUnitario: 0 },
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                Agregar línea
              </Button>
            </section>

            {/* De las cinco ayudas que había, sobrevive una sola: la que
                evita el error caro. Si la dirección de entrega está mal, el
                camión va a otro lado. Las demás explicaban campos que ya se
                explican solos por su nombre. */}
            <section className="border-line bg-panel grid gap-3 rounded-xl border p-4">
              <p className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Entrega
              </p>

              <div>
                <Label htmlFor="obra">Obra o lugar de entrega</Label>
                <Input
                  id="obra"
                  value={obra}
                  onChange={(e) => {
                    setObra(e.target.value);
                    marcarPulso('entrega');
                  }}
                  placeholder="Ruta 41 km 12, lote 8"
                  className="mt-1.5"
                />
                <p className="text-faint mt-1 text-xs">
                  Casi nunca es la dirección fiscal. Es lo primero que mira el chofer.
                </p>
              </div>

              <div>
                <Label htmlFor="km">Distancia desde la planta</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="km"
                    value={km}
                    onChange={(e) => {
                      setKm(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'));
                      marcarPulso('entrega');
                    }}
                    inputMode="decimal"
                    className="w-24 text-right font-mono tabular-nums"
                    placeholder="0"
                  />
                  <span className="text-ink-soft text-sm">km</span>
                </div>
              </div>
            </section>

            {esPresupuesto && (
              <section className="border-line bg-panel grid gap-2 rounded-xl border p-4">
                <Label htmlFor="validez">Vale por</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="validez"
                    value={validez}
                    onChange={(e) => {
                      setValidez(e.target.value.replace(/\D/g, ''));
                      marcarPulso('validez');
                    }}
                    inputMode="numeric"
                    className="w-20 text-right font-mono tabular-nums"
                  />
                  <span className="text-ink-soft text-sm">días</span>
                </div>
                <p className="text-faint text-xs">
                  Va impreso: con esta inflación, un precio sin vencimiento no se puede
                  sostener.
                </p>
              </section>
            )}

            <section className="border-line bg-panel grid gap-1.5 rounded-xl border p-4">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Input
                id="notas"
                value={notas}
                onChange={(e) => {
                  setNotas(e.target.value);
                  marcarPulso('notas');
                }}
                placeholder="Forma de pago, horario, lo que haga falta"
              />
            </section>

            {/* La barra de emitir. El total va acá y grande porque es donde
                se decide; en el papel vive como parte del documento, que es
                su lugar natural. Antes competían y no ganaba ninguno.

                Ya no está clavada al fondo: había tres capas pegajosas a la
                vez —barra superior, papel y esta— moviéndose a distinta
                velocidad, y el scroll se sentía resbaloso. Queda una sola,
                la de arriba. */}
            </>
          ) : (
            /* Modo lectura: el papel de al lado ya muestra todo lo que
               dice el documento, así que acá no se repite nada. Sólo la
               puerta para cambiarlo si hace falta. */
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="border-line bg-panel hover:border-line-strong hover:bg-sunk flex w-full items-center gap-2.5 rounded-xl border border-dashed p-4 text-left transition-colors"
            >
              <Pencil className="text-faint size-4 shrink-0" aria-hidden />
              <span>
                <span className="block text-sm font-medium">Editar el documento</span>
                <span className="text-faint block text-xs">
                  Los datos salieron de la carga {carga?.id}. Tocá sólo si hay que cambiar algo.
                </span>
              </span>
            </button>
          )}

          <div>
            <div className="border-line bg-panel shadow-elevada rounded-xl border p-4">
              {conValores && total !== null && (
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                    Total
                  </span>
                  <span className="font-mono text-2xl font-semibold tabular-nums">{$(total)}</span>
                </div>
              )}
              <Button
                size="lg"
                className="w-full"
                onClick={emitir}
                disabled={!valido || emitiendo}
              >
                {emitiendo ? 'Emitiendo…' : 'Emitir y ver para imprimir'}
              </Button>
              <p className="text-faint mt-2 text-xs">
                Hasta que lo emitas es un borrador y no ocupa ningún número.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
