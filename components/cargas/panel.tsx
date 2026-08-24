'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AsignarCargas } from '@/components/app/asignar-cargas';
import { BarraFiscal } from '@/components/dominio/barra-fiscal';
import { Cifra } from '@/components/dominio/cifra';
import { Estado } from '@/components/dominio/estado';
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
  colorDeReceta,
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

  const dias = useMemo(() => {
    const todas = [...delDia, ...d.recientes].filter(
      (c) => coincideCarga(c, busqueda) && (receta === 'todas' || c.receta === receta),
    );
    return agruparPorDia(todas);
  }, [delDia, d.recientes, busqueda, receta]);

  const hayFiltro = busqueda.trim() !== '' || receta !== 'todas';

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
            las tres preguntas que José trae cuando entra. */}
        <section className="border-line bg-card shadow-tarjeta mt-5 grid gap-x-8 gap-y-5 rounded-lg border p-4 lg:grid-cols-[auto_minmax(14rem,1fr)_minmax(12rem,1fr)_auto] lg:items-center">
          <div className="flex gap-8">
            <Dato rotulo="Cargas hoy">
              <Cifra valor={num(hoy.cargas)} tamano="lg" />
            </Dato>
            <Dato rotulo="Volumen">
              <Cifra valor={dec(hoy.m3)} unidad="m³" tamano="lg" />
            </Dato>
          </div>

          <Dato rotulo="Mezcla del día">
            {mezcla.length === 0 ? (
              <p className="text-faint text-sm">Todavía no se produjo</p>
            ) : (
              <>
                <span className="bg-sunk flex h-2.5 overflow-hidden rounded-full">
                  {mezcla.map((p) => (
                    <span
                      key={p.receta}
                      className={cn('h-full', colorFondo(p.receta, d.recetas))}
                      style={{ width: `${p.pct}%` }}
                    />
                  ))}
                </span>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {mezcla.map((p) => (
                    <span key={p.receta} className="flex items-center gap-1.5 text-xs">
                      <Muestra receta={p.receta} recetas={d.recetas} />
                      <span className="font-mono">{p.receta}</span>
                      <span className="text-faint num">{dec(p.m3)} m³</span>
                    </span>
                  ))}
                </span>
              </>
            )}
          </Dato>

          <Dato rotulo="Facturado del día">
            {hoy.pctBlanco === null ? (
              <p className="text-faint text-sm">Ninguna con el corte definido</p>
            ) : (
              <>
                <BarraFiscal blanco={hoy.blanco} negro={hoy.negro} className="h-2.5" />
                <span className="mt-2 flex flex-wrap justify-between gap-x-4 text-xs">
                  <span>
                    <span className="num">{hoy.pctBlanco.toFixed(0)}%</span> en blanco
                  </span>
                  <span className="text-faint num">{$(hoy.facturado)}</span>
                </span>
              </>
            )}
          </Dato>

          <Dato rotulo="Sin cliente">
            <Cifra
              valor={num(sinCliente.length)}
              tamano="lg"
              tono={sinCliente.length > 0 ? 'warn' : 'neutro'}
            />
          </Dato>
        </section>

        {/* R4 — molesta por jerarquía y contador, no por un rectángulo de
            color: va en superficie hundida, arriba de todo el historial. */}
        {sinCliente.length > 0 && (
          <section className="border-line bg-sunk mt-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="rotulo-obra font-heading text-base font-semibold">
                Cargas sin cliente ({num(sinCliente.length)})
              </h2>
              <span className="text-muted-foreground num text-xs">
                {dec(sinCliente.reduce((a, c) => a + c.m3, 0))} m³ sin imputar
              </span>
            </div>

            <div className="mt-3">
              <AsignarCargas cargas={sinCliente} clientes={d.clientes} onAsignar={asignar} />
            </div>
          </section>
        )}

        <section className="border-line bg-card shadow-tarjeta mt-4 overflow-hidden rounded-lg border">
          <div className="border-line flex flex-wrap items-center gap-3 border-b p-4">
            <span className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                className="text-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por carga o receta"
                aria-label="Buscar cargas"
                className="h-9 w-full pl-8"
              />
            </span>
            {/* Sin filtro de fecha: el historial ya viene agrupado por día
                y son cuatro. Un calendario sobre cuatro días es un control
                que no ahorra nada. */}
            <Segmentado
              valor={receta}
              onCambio={setReceta}
              opciones={[
                { valor: 'todas', etiqueta: 'Todas' },
                ...d.recetas.map((r) => ({ valor: r, etiqueta: r })),
              ]}
            />
          </div>

          {dias.length === 0 ? (
            <EstadoVacio
              className="m-4"
              titulo={hayFiltro ? 'Ninguna carga coincide' : 'Todavía no se produjo'}
              descripcion={
                hayFiltro
                  ? 'Probá con otro número de carga o sacá el filtro de receta.'
                  : 'Cuando el PLC cierre el primer ciclo, la carga aparece acá sola.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sunk">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20">Hora</TableHead>
                    <TableHead className="w-24">Carga</TableHead>
                    <TableHead className="w-28">Receta</TableHead>
                    <TableHead className="w-28 text-right">Volumen</TableHead>
                    <TableHead className="w-36 text-right">Monto</TableHead>
                    <TableHead className="w-44">Facturado</TableHead>
                    <TableHead className="w-32 text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dias.map((dia, i) => (
                    <Fragmento key={dia.dia}>
                      {/* El encabezado del día trae su propio resumen: la
                          lista deja de ser una tira plana. */}
                      <TableRow className="bg-sunk/60 hover:bg-sunk/60">
                        <TableCell colSpan={7} className="py-2">
                          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                            <span className="font-medium">
                              {i === 0 && esHoy(dia.dia)
                                ? 'Hoy'
                                : fechaLargaDeMomento(dia.momento)}
                            </span>
                            <span className="text-faint num text-xs">
                              {num(dia.resumen.cargas)}{' '}
                              {dia.resumen.cargas === 1 ? 'carga' : 'cargas'} ·{' '}
                              {dec(dia.resumen.m3)} m³ · {$(dia.resumen.facturado)}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                      {dia.cargas.map((c) => (
                        <FilaCarga key={c.id} carga={c} recetas={d.recetas} />
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

/** Un rótulo arriba y el dato abajo. La pieza del resumen del día. */
function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">{rotulo}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * La muestra de color de una receta.
 *
 * Un cuadrado y no un relleno con el nombre adentro: el texto blanco
 * sobre el ámbar de H-25 da 3,57:1 y sobre el verde de H-30 da 4,32:1,
 * los dos por debajo del 4,5 que pide un texto de este tamaño. El
 * cuadrado sólo tiene que separarse del fondo —3:1— y ahí los tres
 * pasan holgados. Es además el mismo recurso que usa "Costo por
 * material" en Rentabilidad.
 */
function Muestra({ receta, recetas }: { receta: string; recetas: string[] }) {
  const color = colorDeReceta(receta, recetas);
  return (
    <span
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-[3px]',
        color ? colorFondo(receta, recetas) : 'border-line-strong border',
      )}
      aria-hidden
    />
  );
}

/**
 * Las clases van escritas enteras a propósito.
 *
 * Tailwind escanea el código buscando nombres de clase literales: un
 * `bg-${color}` armado en tiempo de ejecución nunca aparece en el
 * escaneo y el CSS no se genera. La receta sale gris y nadie entiende
 * por qué.
 */
const FONDO_SERIE = {
  s1: 'bg-s1',
  s2: 'bg-s2',
  s3: 'bg-s3',
  s4: 'bg-s4',
} as const;

function colorFondo(receta: string, recetas: string[]) {
  const color = colorDeReceta(receta, recetas);
  return color ? FONDO_SERIE[color] : 'bg-faint';
}

function esHoy(dia: string) {
  return dia === diaLocal(new Date().toISOString());
}

/** Sin `<>` para poder llevar key en un grupo de filas de tabla. */
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function FilaCarga({ carga: c, recetas }: { carga: Carga; recetas: string[] }) {
  const corte = pesosDe(c);
  const pct = porcentajeFacturado(c);

  return (
    <TableRow className={cn(c.estado === 'anulada' && 'text-faint')}>
      <TableCell className="num text-muted-foreground text-sm">{hora(c.momento)}</TableCell>
      <TableCell className="num text-sm font-medium">{c.id}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <Muestra receta={c.receta} recetas={recetas} />
          <span className="num text-sm">{c.receta}</span>
        </span>
      </TableCell>
      {/* El volumen es lo que la planta produjo: es el número de la fila. */}
      <TableCell className="text-right">
        <Cifra valor={dec(c.m3)} unidad="m³" tamano="lg" />
      </TableCell>
      <TableCell className="num text-right text-sm">
        {c.total ? $(c.total) : <span className="text-faint">—</span>}
      </TableCell>
      <TableCell>
        {corte && pct !== null ? (
          <span className="flex items-center gap-2.5">
            <BarraFiscal blanco={corte.blanco} negro={corte.negro} className="w-16 shrink-0" />
            <span className="num text-xs">{pct}% en blanco</span>
          </span>
        ) : (
          <span className="text-faint text-xs">sin definir</span>
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
