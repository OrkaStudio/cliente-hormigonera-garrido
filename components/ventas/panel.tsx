'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, CircleAlert, Search } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AsignarCargas } from '@/components/app/asignar-cargas';
import { BarraFiscal } from '@/components/dominio/barra-fiscal';
import { Cifra } from '@/components/dominio/cifra';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { MuestraReceta } from '@/components/dominio/etiqueta-receta';
import { Segmentado } from '@/components/dominio/segmentado';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { aplicarAsignaciones, asignarLocal, leerAsignaciones } from '@/lib/datos/cargas-locales';
import type { DatosVentas } from '@/lib/datos/ventas';
import type { Carga } from '@/lib/datos/tipos';
import { agruparEnVentas, coincideVenta, type Venta } from '@/lib/dominio/ventas';
import { $, dec, fechaLargaDeMomento, hora, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Ventas — los apartados 2 y 3 en una sola pantalla.
 *
 * Antes eran dos. Cargas listaba los pastones y Ventas listaba lo mismo
 * agrupado, con siete de ocho columnas iguales: dos pantallas para la
 * misma pregunta con distinto zoom. Ahora la venta es el renglón y el
 * pastón es su detalle, desplegable.
 *
 * No hay pedido pendiente entre jornadas: se produce y se despacha el
 * mismo día, así que una venta es lo que YA salió y no una promesa
 * → decisiones/hormigonera-la-venta-es-el-dia
 *
 * Nada fiscal: los papeles que salen de acá son comprobantes comerciales
 * → decisiones/hormigonera-plataforma-sin-fiscal
 */
export function PanelVentas({ datos: d }: { datos: DatosVentas }) {
  const router = useRouter();
  const [sinAsignar, setSinAsignar] = useState<Carga[]>(d.sinAsignar);
  const [ventas, setVentas] = useState<Venta[]>(d.ventas);
  const [busqueda, setBusqueda] = useState('');
  const [receta, setReceta] = useState('todas');

  /* Lo asignado en este navegador se aplica después de montar: en el
     servidor no existe localStorage. */
  useEffect(() => {
    const asignaciones = leerAsignaciones();
    setSinAsignar(aplicarAsignaciones(d.sinAsignar, asignaciones).filter((c) => !c.clienteId));
    setVentas(
      agruparEnVentas([
        ...d.ventas.flatMap((v) => v.cargas),
        ...aplicarAsignaciones(d.sinAsignar, asignaciones).filter((c) => c.clienteId),
      ]),
    );
  }, [d.sinAsignar, d.ventas]);

  function asignar(cargaId: string, clienteId: string, total: number) {
    asignarLocal(cargaId, clienteId, total);
    const carga = sinAsignar.find((c) => c.id === cargaId);
    setSinAsignar((prev) => prev.filter((c) => c.id !== cargaId));
    if (carga) {
      // La carga recién asignada se mete en el grupo que le corresponde:
      // si ya hubo otro pastón de ese cliente y receta hoy, es la MISMA
      // venta y tiene que sumarse ahí, no aparecer como una nueva.
      setVentas((prev) =>
        agruparEnVentas([
          ...prev.flatMap((v) => v.cargas),
          { ...carga, clienteId, total, estado: 'asignada' as const },
        ]),
      );
    }
    router.refresh();
  }

  const nombreDe = (id: string) => d.nombresDeCliente[id] ?? id;

  const visibles = useMemo(
    () =>
      ventas.filter(
        (v) =>
          coincideVenta(v, nombreDe(v.clienteId), null, busqueda) &&
          (receta === 'todas' || v.receta === receta),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ventas, busqueda, receta],
  );

  const mes = useMemo(
    () => ({
      m3: ventas.reduce((a, v) => a + v.m3, 0),
      total: ventas.reduce((a, v) => a + v.total, 0),
      blanco: ventas.reduce((a, v) => a + v.blanco, 0),
      negro: ventas.reduce((a, v) => a + v.negro, 0),
    }),
    [ventas],
  );

  const hayFiltro = busqueda.trim() !== '' || receta !== 'todas';

  /* Un mes son muchas ventas. Se ven las más nuevas y el resto está a un
     clic; con un filtro puesto se muestran todas, porque quien buscó
     quiere ver lo que encontró. */
  const [todas, setTodas] = useState(false);
  const enPantalla = hayFiltro || todas ? visibles : visibles.slice(0, A_LA_VISTA);
  const restantes = visibles.length - enPantalla.length;

  return (
    <>
      <BarraSuperior activo="Ventas" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Ventas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cada venta que salió de la planta, con los pastones que la formaron. Los últimos 30
          días, desde el {fechaLargaDeMomento(d.desde)}.
        </p>

        {/* El día de un vistazo: cuánto salió, de qué y por cuánto. Es lo
            que José trae cuando entra. */}
        <section className="border-line bg-card shadow-tarjeta divide-line mt-5 grid gap-x-6 divide-y rounded-lg border p-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 [&>*]:min-w-0">
          <Dato rotulo="Cargas hoy">
            <Cifra valor={num(d.hoy.cargas)} tamano="lg" />
            <p className="text-faint mt-1 text-xs">las largó el autómata</p>
          </Dato>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <Dato rotulo="Volumen hoy">
              <Cifra valor={dec(d.hoy.m3)} unidad="m³" tamano="lg" />
              <p className="text-faint mt-1 text-xs">producido y despachado</p>
            </Dato>
          </div>
          <div className="pt-4 sm:pt-0 lg:pl-6">
            <Dato rotulo="Vendido hoy">
              <Cifra valor={$(d.hoy.total)} tamano="lg" />
              <p className="text-faint mt-1 text-xs">al precio de cada venta</p>
            </Dato>
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <Dato rotulo="Sin asignar">
              <Cifra
                valor={num(sinAsignar.length)}
                tamano="lg"
                tono={sinAsignar.length > 0 ? 'warn' : 'neutro'}
              />
              <p className="text-faint mt-1 text-xs">
                {sinAsignar.length === 0 ? 'todo tiene cliente' : 'esperan cliente y precio'}
              </p>
            </Dato>
          </div>
        </section>

        {/* Lo primero que hay que resolver, arriba de todo: un pastón sin
            cliente es plata que no está imputada a nadie (R4 del ap. 2). */}
        {sinAsignar.length > 0 && (
          <section className="border-warn-line bg-warn-suave mt-4 rounded-lg border p-4">
            <h2 className="font-heading flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="text-warn-text size-4 shrink-0" aria-hidden />
              {num(sinAsignar.length)}{' '}
              {sinAsignar.length === 1 ? 'carga sin cliente' : 'cargas sin cliente'}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Salieron de la planta y todavía no son de nadie: no suman a ninguna venta ni se
              pueden documentar.
            </p>
            <div className="mt-3">
              <AsignarCargas
                cargas={sinAsignar}
                clientes={d.clientes}
                onAsignar={asignar}
                formato="detallada"
                recetas={d.recetas}
                ultimoPrecio={d.ultimoPrecio}
              />
            </div>
          </section>
        )}

        <section className="border-line bg-card shadow-tarjeta mt-4 overflow-hidden rounded-lg border">
          <div className="border-line flex flex-wrap items-end justify-between gap-5 border-b p-4">
            <div className="flex flex-wrap items-end gap-5">
              <Filtro rotulo="Buscar" htmlFor="buscar">
                <span className="relative block">
                  <Search
                    className="text-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    id="buscar"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Cliente o N° de carga"
                    className="h-9 w-full pl-8 sm:w-56"
                  />
                </span>
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

            {/* El corte del mes, donde se lo puede leer contra la tabla
                que lo produce. */}
            <div className="grid w-full gap-1.5 sm:w-56">
              <span className="text-faint flex items-baseline justify-between text-[11px] font-semibold tracking-[0.08em] uppercase">
                En blanco · 30 días
                <span className="num text-ink-soft tracking-normal">
                  {mes.blanco + mes.negro > 0
                    ? `${Math.round((mes.blanco / (mes.blanco + mes.negro)) * 100)}%`
                    : '—'}
                </span>
              </span>
              <BarraFiscal blanco={mes.blanco} negro={mes.negro} className="h-3 rounded" />
              <span className="text-faint text-xs">
                <span className="num">{$(mes.total)}</span> en {num(ventas.length)}{' '}
                {ventas.length === 1 ? 'venta' : 'ventas'} · {dec(mes.m3)} m³
              </span>
            </div>
          </div>

          {visibles.length === 0 ? (
            <EstadoVacio
              className="m-4"
              titulo={hayFiltro ? 'Ninguna venta coincide' : 'Todavía no hay ventas este mes'}
              descripcion={
                hayFiltro
                  ? 'Probá con otro cliente, otro número de carga o sacá el filtro de receta.'
                  : 'Una venta aparece sola cuando a un pastón se le asigna cliente.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sunk">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-28">
                      <Rotulo>Día</Rotulo>
                    </TableHead>
                    <TableHead className="w-full min-w-40">
                      <Rotulo>Cliente</Rotulo>
                    </TableHead>
                    <TableHead className="w-24">
                      <Rotulo>Receta</Rotulo>
                    </TableHead>
                    <TableHead className="w-32 text-right whitespace-nowrap">
                      <Rotulo>Volumen</Rotulo>
                    </TableHead>
                    <TableHead className="w-32 text-right whitespace-nowrap">
                      <Rotulo>Monto</Rotulo>
                    </TableHead>
                    <TableHead className="w-32 text-right whitespace-nowrap">
                      <Rotulo>En blanco</Rotulo>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enPantalla.map((v) => (
                    <FilaVenta
                      key={v.id}
                      venta={v}
                      nombre={nombreDe(v.clienteId)}
                      recetas={d.recetas}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setTodas(true)}
              className="border-line text-muted-foreground hover:text-ink hover:bg-sunk focus-visible:ring-ring/50 w-full border-t py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
            >
              Ver {restantes === 1 ? 'la venta anterior' : `las ${num(restantes)} ventas anteriores`}
            </button>
          )}
        </section>

        <p className="text-faint mt-2 text-xs">
          Una venta agrupa los pastones del mismo cliente y la misma receta en el día — tocá una
          fila para verlos. El registro que llega del autómata trae receta, volumen y hora, pero{' '}
          <span className="text-ink-soft">no trae el cliente</span>: hasta que eso se resuelva
          con el integrador, asignarlo es a mano.
        </p>
      </main>
    </>
  );
}

/** Cuántas ventas se ven sin desplegar. */
const A_LA_VISTA = 25;

function FilaVenta({
  venta: v,
  nombre,
  recetas,
}: {
  venta: Venta;
  nombre: string;
  recetas: string[];
}) {
  const [abierta, setAbierta] = useState(false);
  const varios = v.cargas.length > 1;

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
      >
        <TableCell>
          <span className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                'text-faint size-3.5 shrink-0 transition-transform',
                abierta && 'rotate-90',
              )}
              aria-hidden
            />
            <span className="num text-sm">{fechaCorta(v.dia)}</span>
          </span>
        </TableCell>
        <TableCell className="max-w-0 truncate text-sm">
          {/* El nombre entra al cliente; el resto de la fila despliega. */}
          <Link
            href={`/clientes/${v.clienteId}` as Route}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 underline-offset-4 hover:underline"
          >
            {nombre}
          </Link>
        </TableCell>
        <TableCell>
          <span className="flex items-center gap-2">
            <MuestraReceta receta={v.receta} recetas={recetas} />
            <span className="num text-sm">{v.receta}</span>
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className="num text-sm">
            {dec(v.m3)}
            <span className="text-faint ml-0.5">m³</span>
          </span>
          <span className="text-faint block text-xs">
            {num(v.cargas.length)} {varios ? 'pastones' : 'pastón'}
          </span>
        </TableCell>
        <TableCell className="num text-right text-sm">{$(v.total)}</TableCell>
        <TableCell>
          <span className="ml-auto flex w-24 flex-col items-end gap-1">
            <span className="num text-xs">
              {v.pctBlanco === null ? (
                <span className="text-faint">sin definir</span>
              ) : (
                `${Math.round(v.pctBlanco)}%`
              )}
            </span>
            <BarraFiscal blanco={v.blanco} negro={v.negro} className="h-1.5 w-full rounded-full" />
          </span>
        </TableCell>
      </TableRow>

      {abierta && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-sunk p-0">
            <div className="px-4 py-3">
              <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
                Los {varios ? `${num(v.cargas.length)} pastones` : 'pastones'} de esta venta
              </p>
              <ul className="divide-line/70 mt-1.5 divide-y">
                {v.cargas.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1.5 text-sm"
                  >
                    <span className="num text-ink-soft w-20 shrink-0 text-xs">{hora(c.momento)}</span>
                    <span className="num w-24 shrink-0">{c.id}</span>
                    <span className="num w-20 shrink-0 text-right">
                      {dec(c.m3)}
                      <span className="text-faint ml-0.5">m³</span>
                    </span>
                    <span className="num text-muted-foreground w-28 shrink-0 text-right">
                      {$(c.total)}
                    </span>
                    {c.sospechosa && (
                      <span className="text-warn-text text-xs">valores fuera de rango</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** "Hoy" cuando es hoy, y si no el día y el mes. Nadie lee "2026-08-25". */
function fechaCorta(dia: string) {
  const [a, m, d] = dia.split('-').map(Number);
  const fecha = new Date(a!, m! - 1, d!);
  if (fecha.toDateString() === new Date().toDateString()) return 'Hoy';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">{rotulo}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </span>
  );
}

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
