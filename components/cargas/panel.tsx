'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Search } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AsignarCargas } from '@/components/app/asignar-cargas';
import { BarraFiscal } from '@/components/dominio/barra-fiscal';
import { Cifra } from '@/components/dominio/cifra';
import { Estado } from '@/components/dominio/estado';
import {
  EtiquetaReceta,
  fondoDeReceta,
  textoDeReceta,
} from '@/components/dominio/etiqueta-receta';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { Input } from '@/components/ui/input';
import { Segmentado } from '@/components/dominio/segmentado';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { asignarLocal, aplicarAsignaciones, leerAsignaciones } from '@/lib/datos/cargas-locales';
import type { DatosCargas } from '@/lib/datos/cargas';
import {
  agruparPorDia,
  coincideCarga,
  diaLocal,
  mezclaPorReceta,
  resumirCargas,
} from '@/lib/dominio/cargas';
import { pesosDe, porcentajeFacturado } from '@/lib/dominio/fiscal';
import type { Carga } from '@/lib/datos/tipos';
import { $, dec, fechaLargaDeMomento, hora, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Apartado 2 — Cargas. El tronco del sistema.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-2-cargas.md
 *
 * Tres cosas que ordenan la pantalla:
 *
 *  · R1 — Node-RED es el ÚNICO que crea cargas. Acá no hay botón de
 *    "nueva carga" y no lo va a haber: si el PLC no la produjo, no
 *    existe.
 *  · R4 — una carga sin cliente es visible y molesta. Va antes que el
 *    historial, pero molesta por jerarquía y contador, no por un
 *    rectángulo de color.
 *  · Esta pantalla NO es de vigilancia en vivo. José está a 180 km y
 *    entra cuando puede: la probabilidad de que esté mirando justo en el
 *    minuto en que el autómata dosifica es mínima. Por eso arriba va el
 *    resumen del día y no un panel que casi siempre estaría quieto.
 */
export function PanelCargas({ datos: d }: { datos: DatosCargas }) {
  const router = useRouter();
  const [sinCliente, setSinCliente] = useState<Carga[]>(d.sinCliente);
  const [delDia, setDelDia] = useState<Carga[]>(d.delDia);
  const [busqueda, setBusqueda] = useState('');
  const [receta, setReceta] = useState('todas');
  const [dia, setDia] = useState('todos');

  // Las asignaciones hechas en este navegador se aplican después de
  // montar: en el servidor no existe localStorage.
  useEffect(() => {
    const conAsignaciones = aplicarAsignaciones(d.delDia, leerAsignaciones());
    setDelDia(conAsignaciones);
    setSinCliente(conAsignaciones.filter((c) => !c.clienteId && c.estado !== 'anulada'));
  }, [d.delDia]);

  function asignar(cargaId: string, clienteId: string, total: number) {
    asignarLocal(cargaId, clienteId, total);
    setSinCliente((prev) => prev.filter((c) => c.id !== cargaId));
    setDelDia((prev) =>
      prev.map((c) => (c.id === cargaId ? { ...c, clienteId, total, estado: 'asignada' } : c)),
    );
    router.refresh();
  }

  const hoy = useMemo(() => resumirCargas(delDia), [delDia]);
  const mezcla = useMemo(() => mezclaPorReceta(delDia), [delDia]);

  const todasLasCargas = useMemo(() => [...delDia, ...d.recientes], [delDia, d.recientes]);

  /* Un desplegable de los días que existen, no un calendario: son cuatro
     y elegir en un almanaque una fecha sin cargas no lleva a ningún
     lado. */
  const opcionesDeDia = useMemo(
    () =>
      agruparPorDia(todasLasCargas).map((g) => ({
        valor: g.dia,
        etiqueta: esHoy(g.dia) ? 'Hoy' : fechaLargaDeMomento(g.momento),
      })),
    [todasLasCargas],
  );

  const dias = useMemo(
    () =>
      agruparPorDia(
        todasLasCargas.filter(
          (c) =>
            coincideCarga(c, busqueda) &&
            (receta === 'todas' || c.receta === receta) &&
            (dia === 'todos' || diaLocal(c.momento) === dia),
        ),
      ),
    [todasLasCargas, busqueda, receta, dia],
  );

  const hayFiltro = busqueda.trim() !== '' || receta !== 'todas' || dia !== 'todos';

  const nombreDe = (id: string | null) => (id ? (d.nombresDeCliente[id] ?? id) : null);

  return (
    <>
      <BarraSuperior activo="Cargas" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Cargas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Las escribe el autómata. Acá se les pone cliente.
        </p>

        {/* El día de un vistazo. Cuánto, de qué, y cuánto se facturó —
            las tres preguntas que José trae cuando entra. Separadas por
            líneas: son cuatro lecturas distintas, no una fila de datos. */}
        <section className="border-line bg-card shadow-tarjeta divide-line mt-5 grid gap-x-6 divide-y rounded-lg border p-4 sm:divide-x sm:divide-y-0 lg:grid-cols-[auto_minmax(16rem,1fr)_minmax(14rem,1fr)_auto]">
          <div className="flex gap-8 pb-4 sm:pr-6 sm:pb-0">
            <Dato rotulo="Cargas hoy">
              <Cifra valor={num(hoy.cargas)} tamano="lg" />
            </Dato>
            <Dato rotulo="Volumen">
              <Cifra valor={dec(hoy.m3)} unidad="m³" tamano="lg" />
            </Dato>
          </div>

          <div className="py-4 sm:px-6 sm:py-0">
            <Dato rotulo="Mezcla del día">
              {mezcla.length === 0 ? (
                <p className="text-faint text-sm">Todavía no se produjo</p>
              ) : (
                <>
                  <span className="bg-sunk flex h-3 overflow-hidden rounded">
                    {mezcla.map((p) => (
                      <span
                        key={p.receta}
                        className={cn('h-full', fondoDeReceta(p.receta, d.recetas))}
                        style={{ width: `${p.pct}%` }}
                      />
                    ))}
                  </span>
                  {/* A los extremos, como la barra: cada rótulo cae del
                      lado de su tramo. */}
                  <span className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                    {mezcla.map((p) => (
                      <span
                        key={p.receta}
                        className={cn('num', textoDeReceta(p.receta, d.recetas))}
                      >
                        {p.receta} ({dec(p.m3)} m³)
                      </span>
                    ))}
                  </span>
                </>
              )}
            </Dato>
          </div>

          <div className="py-4 sm:px-6 sm:py-0">
            <Dato rotulo="Distribución">
              {hoy.pctBlanco === null ? (
                <p className="text-faint text-sm">Ninguna con el corte definido</p>
              ) : (
                <>
                  <BarraFiscal blanco={hoy.blanco} negro={hoy.negro} className="h-3 rounded" />
                  <span className="mt-2 flex justify-between gap-x-4 text-sm">
                    <span>
                      Blanco <span className="num text-faint">{hoy.pctBlanco.toFixed(0)}%</span>
                    </span>
                    <span>
                      <span className="num text-faint">
                        {(100 - hoy.pctBlanco).toFixed(0)}%
                      </span>{' '}
                      Negro
                    </span>
                  </span>
                </>
              )}
            </Dato>
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-6">
            <Dato rotulo="Cargas sin cliente">
              <Cifra
                valor={num(sinCliente.length)}
                tamano="lg"
                tono={sinCliente.length > 0 ? 'warn' : 'neutro'}
              />
            </Dato>
          </div>
        </section>

        {/* R4 — molesta por jerarquía y contador, no por un rectángulo de
            color: va en superficie hundida, arriba de todo el historial. */}
        {sinCliente.length > 0 && (
          <section className="border-line bg-sunk mt-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="font-heading flex items-center gap-2 text-sm font-semibold">
                <CircleAlert className="text-warn size-4 shrink-0" aria-hidden />
                Cargas sin imputar ({num(sinCliente.length)})
              </h2>
              <span className="text-muted-foreground num text-xs">
                {dec(sinCliente.reduce((a, c) => a + c.m3, 0))} m³ sin imputar
              </span>
            </div>

            <div className="mt-3">
              <AsignarCargas
                cargas={sinCliente}
                clientes={d.clientes}
                onAsignar={asignar}
                formato="detallada"
                recetas={d.recetas}
              />
            </div>
          </section>
        )}

        <section className="border-line bg-card shadow-tarjeta mt-4 overflow-hidden rounded-lg border">
          {/* Cada filtro con su rótulo arriba: son tres controles distintos
              y sin nombre había que probarlos para saber qué hacían. */}
          <div className="border-line flex flex-wrap items-end gap-5 border-b p-4">
            <Filtro rotulo="Buscar carga" htmlFor="buscar">
              <span className="relative block">
                <Search
                  className="text-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="buscar"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Ej: C-1595"
                  className="h-9 w-full pl-8 sm:w-56"
                />
              </span>
            </Filtro>

            <Filtro rotulo="Día" htmlFor="dia">
              <select
                id="dia"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="border-line bg-card focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="todos">Todos</option>
                {opcionesDeDia.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </Filtro>

            <Filtro rotulo="Receta">
              <Segmentado
                valor={receta}
                onCambio={setReceta}
                opciones={[
                  { valor: 'todas', etiqueta: 'Todas' },
                  ...d.recetas.map((r) => ({ valor: r, etiqueta: r })),
                ]}
              />
            </Filtro>
          </div>

          {dias.length === 0 ? (
            <EstadoVacio
              className="m-4"
              titulo={hayFiltro ? 'Ninguna carga coincide' : 'Todavía no se produjo'}
              descripcion={
                hayFiltro
                  ? 'Probá con otro número de carga, otro día, o sacá el filtro de receta.'
                  : 'Cuando el PLC cierre el primer ciclo, la carga aparece acá sola.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sunk">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20">
                      <Rotulo>Hora</Rotulo>
                    </TableHead>
                    <TableHead className="w-24">
                      <Rotulo>Carga</Rotulo>
                    </TableHead>
                    <TableHead className="w-24">
                      <Rotulo>Receta</Rotulo>
                    </TableHead>
                    {/* Absorbe el ancho sobrante. Sin ella, la tabla
                        repartía 130 px de vacío en cada columna de
                        números y el rótulo quedaba flotando sobre un
                        hueco en vez de sobre su dato. */}
                    <TableHead className="w-full min-w-44">
                      <Rotulo>Pedido</Rotulo>
                    </TableHead>
                    <TableHead className="w-24 text-right whitespace-nowrap">
                      <Rotulo>Volumen</Rotulo>
                    </TableHead>
                    <TableHead className="w-28 text-right whitespace-nowrap">
                      <Rotulo>Monto</Rotulo>
                    </TableHead>
                    {/* "En blanco" y no "Distribución": el porcentaje es
                        cuánto de esa venta se facturó, y con el rótulo
                        anterior no se sabía si era el blanco o el negro. */}
                    <TableHead className="w-36 text-center whitespace-nowrap">
                      <Rotulo>En blanco</Rotulo>
                    </TableHead>
                    <TableHead className="w-28 text-right whitespace-nowrap">
                      <Rotulo>Estado</Rotulo>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dias.map((grupo, i) => (
                    <Fragmento key={grupo.dia}>
                      {/* El encabezado del día trae su propio resumen: la
                          lista deja de ser una tira plana. */}
                      <TableRow className="bg-sunk/60 hover:bg-sunk/60">
                        <TableCell colSpan={8} className="py-2">
                          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                            <span className="font-medium">
                              {i === 0 && esHoy(grupo.dia)
                                ? 'Hoy'
                                : fechaLargaDeMomento(grupo.momento)}
                            </span>
                            <span className="text-muted-foreground num text-xs">
                              {num(grupo.resumen.cargas)}{' '}
                              {grupo.resumen.cargas === 1 ? 'carga' : 'cargas'} ·{' '}
                              {dec(grupo.resumen.m3)} m³ · {$(grupo.resumen.facturado)}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                      {grupo.cargas.map((c) => (
                        <FilaCarga
                          key={c.id}
                          carga={c}
                          recetas={d.recetas}
                          nombreCliente={nombreDe(c.clienteId)}
                          pedidoId={c.pedidoId ?? null}
                          atenuada={!esHoy(grupo.dia)}
                        />
                      ))}
                    </Fragmento>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/** El rótulo de una columna: chico, en mayúsculas y espaciado. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </span>
  );
}

/** Un filtro con su nombre arriba. */
function Filtro({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase"
      >
        {rotulo}
      </label>
      {children}
    </div>
  );
}

/** Un rótulo arriba y el dato abajo. La pieza del resumen del día. */
function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">{rotulo}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function esHoy(dia: string) {
  return dia === diaLocal(new Date().toISOString());
}

/** Sin `<>` para poder llevar key en un grupo de filas de tabla. */
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function FilaCarga({
  carga: c,
  recetas,
  nombreCliente,
  pedidoId,
  atenuada = false,
}: {
  carga: Carga;
  recetas: string[];
  nombreCliente: string | null;
  pedidoId: string | null;
  /** Los días anteriores pesan menos que hoy: es historial, no novedad. */
  atenuada?: boolean;
}) {
  const corte = pesosDe(c);
  const pct = porcentajeFacturado(c);

  return (
    <TableRow className={cn(atenuada && 'text-muted-foreground', c.estado === 'anulada' && 'text-faint')}>
      <TableCell className="num text-muted-foreground text-sm">{hora(c.momento)}</TableCell>
      <TableCell className="num text-sm font-medium">{c.id}</TableCell>
      <TableCell>
        <EtiquetaReceta receta={c.receta} recetas={recetas} />
      </TableCell>
      <TableCell className="max-w-0 text-sm">
        {pedidoId ? (
          <>
            <span className="num block truncate">{pedidoId}</span>
            <span className="text-faint block truncate text-xs">{nombreCliente}</span>
          </>
        ) : (
          <span className="text-faint italic">sin imputar</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Cifra valor={dec(c.m3)} unidad="m³" tamano="sm" />
      </TableCell>
      <TableCell className="num text-right text-sm">
        {c.total ? $(c.total) : <span className="text-faint">—</span>}
      </TableCell>
      {/* El porcentaje ANTES de la barra y con ancho fijo: así los de
          todas las filas caen en la misma columna y se comparan de
          arriba abajo. Con el número después de la barra bailaban. */}
      <TableCell>
        {corte && pct !== null ? (
          <span
            className="flex items-center justify-center gap-2.5"
            title={`${$(corte.blanco)} facturado de ${$(c.total)}`}
          >
            <span className="num w-9 shrink-0 text-right text-xs">{pct}%</span>
            <BarraFiscal blanco={corte.blanco} negro={corte.negro} className="w-20 shrink-0" />
          </span>
        ) : (
          <span className="text-faint block text-center text-xs italic">Sin asignar</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <EstadoDeCarga carga={c} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Los cuatro estados del modelo y ninguno más: registrada · asignada ·
 * facturada · anulada. "Entregada" y "En viaje" no existen en este
 * producto.
 *
 * La spec del apartado llama "documentada" a lo que el tipo llama
 * `facturada` — es el mismo estado. Se muestra el nombre del código para
 * que la pantalla y el modelo digan lo mismo.
 */
function EstadoDeCarga({ carga: c }: { carga: Carga }) {
  if (c.estado === 'anulada') return <Estado tono="danger">Anulada</Estado>;
  if (!c.clienteId) return <Estado tono="warn">Registrada</Estado>;
  if (c.estado === 'facturada') return <Estado tono="ok">Facturada</Estado>;
  return <Estado>Asignada</Estado>;
}
