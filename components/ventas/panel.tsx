'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { BarraFiscal } from '@/components/dominio/barra-fiscal';
import { Cifra } from '@/components/dominio/cifra';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { MuestraReceta } from '@/components/dominio/etiqueta-receta';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { leerDocumentos } from '@/lib/datos/documentos-locales';
import type { DatosVentas } from '@/lib/datos/ventas';
import { agruparPorDia, diaLocal, resumirCargas } from '@/lib/dominio/cargas';
import type { Documento } from '@/lib/dominio/documentos';
import { pesosDe, porcentajeFacturado } from '@/lib/dominio/fiscal';
import { coincideVenta, documentoDe } from '@/lib/dominio/ventas';
import type { Carga } from '@/lib/datos/tipos';
import { $, dec, fechaLargaDeMomento, hora, num } from '@/lib/formato';

/**
 * Apartado 3 — Ventas y documentos.
 *
 * Dos cosas gobiernan la pantalla:
 *
 *  · **Nada fiscal.** El papel que sale de acá es un comprobante
 *    comercial y lo dice impreso → decisiones/hormigonera-plataforma-sin-fiscal.
 *  · **R5 — blanco y negro nunca se suman sin aclarar.** El corte va
 *    arriba, separado, antes que cualquier otra cosa. Es la razón de ser
 *    del apartado: hoy José y su socio lo sacaban a mano.
 */
export function PanelVentas({ datos: d }: { datos: DatosVentas }) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [dia, setDia] = useState('todos');

  // Los papeles viven en el navegador que los emitió: no existen en el
  // servidor y por eso se leen después de montar.
  useEffect(() => setDocumentos(leerDocumentos()), []);

  const nombreDe = (id: string | null) => (id ? (d.nombresDeCliente[id] ?? id) : null);

  const total = useMemo(() => resumirCargas(d.ventas), [d.ventas]);

  const opcionesDeDia = useMemo(
    () =>
      agruparPorDia(d.ventas).map((g) => ({
        valor: g.dia,
        etiqueta: esHoy(g.dia) ? 'Hoy' : fechaLargaDeMomento(g.momento),
      })),
    [d.ventas],
  );

  const dias = useMemo(
    () =>
      agruparPorDia(
        d.ventas.filter(
          (v) =>
            coincideVenta(v, nombreDe(v.clienteId), documentoDe(v.id, documentos), busqueda) &&
            (dia === 'todos' || diaLocal(v.momento) === dia),
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.ventas, documentos, busqueda, dia],
  );

  const hayFiltro = busqueda.trim() !== '' || dia !== 'todos';

  /* Un mes son veinte y pico de días de producción. Se ven los primeros
     y el resto está a un clic: la pregunta que trae José es del mes,
     pero la fila que busca es de esta semana. */
  const [todosLosDias, setTodosLosDias] = useState(false);
  const visibles = hayFiltro || todosLosDias ? dias : dias.slice(0, DIAS_A_LA_VISTA);
  const restantes = dias.length - visibles.length;

  return (
    <>
      <BarraSuperior activo="Ventas" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Ventas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cada carga con cliente y precio, y el papel que le corresponde. Desde el{' '}
          {fechaLargaDeMomento(d.desde)}.
        </p>

        {/* La leyenda que gobierna todo el apartado. No es letra chica:
            si alguien confunde esto con una factura, el problema es
            nuestro. */}
        <p className="border-line bg-sunk text-muted-foreground mt-4 rounded-lg border border-dashed px-4 py-2.5 text-xs">
          Los papeles de acá son <span className="text-ink">comprobantes comerciales</span>, no
          facturas: la plataforma no emite nada fiscal ni se conecta con ARCA. Lo que sí hace
          es mostrar separado lo que va en blanco de lo que va en negro.
        </p>

        {/* R5 — el corte, antes que nada. */}
        <section className="mt-5 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4 lg:w-64">
            <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
              Total facturado
            </p>
            <div className="mt-1.5">
              <Cifra valor={$(total.facturado)} tamano="lg" />
            </div>
            <p className="text-faint mt-1 text-xs">
              {num(total.cargas)} {total.cargas === 1 ? 'venta' : 'ventas'} ·{' '}
              {dec(total.m3)} m³
              {d.sinAsignar > 0 && (
                <>
                  {' · '}
                  <Link
                    href="/cargas"
                    className="text-warn-text underline-offset-2 hover:underline"
                  >
                    {num(d.sinAsignar)} sin asignar
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
                Blanco y negro
              </p>
              {total.pctBlanco !== null && (
                <p className="flex flex-wrap items-center gap-x-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="border-line bg-paper inline-block size-2.5 rounded-[3px] border" />
                    <span className="num">{total.pctBlanco.toFixed(0)}%</span> blanco
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-ink inline-block size-2.5 rounded-[3px]" />
                    <span className="num">{(100 - total.pctBlanco).toFixed(0)}%</span> negro
                  </span>
                </p>
              )}
            </div>

            {total.pctBlanco === null ? (
              <p className="text-faint mt-3 text-sm">
                Ninguna venta tiene el corte definido todavía.
              </p>
            ) : (
              <>
                <BarraFiscal blanco={total.blanco} negro={total.negro} className="mt-3 h-3" />
                <p className="num mt-2 flex justify-between text-sm">
                  <span>{$(total.blanco)}</span>
                  <span>{$(total.negro)}</span>
                </p>
              </>
            )}
          </div>
        </section>

        <section className="border-line bg-card shadow-tarjeta mt-4 overflow-hidden rounded-lg border">
          <div className="border-line flex flex-wrap items-end gap-5 border-b p-4">
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
                  placeholder="Carga, cliente o documento"
                  className="h-9 w-full pl-8 sm:w-64"
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
          </div>

          {dias.length === 0 ? (
            <EstadoVacio
              className="m-4"
              titulo={hayFiltro ? 'Ninguna venta coincide' : 'Todavía no hay ventas'}
              descripcion={
                hayFiltro
                  ? 'Probá con otro número de carga, otro cliente o sacá el filtro de día.'
                  : 'Una carga se convierte en venta cuando se le asigna cliente y precio, en el apartado de Cargas.'
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
                    <TableHead className="w-full min-w-40">
                      <Rotulo>Cliente</Rotulo>
                    </TableHead>
                    <TableHead className="w-24 text-right whitespace-nowrap">
                      <Rotulo>Volumen</Rotulo>
                    </TableHead>
                    <TableHead className="w-28 text-right whitespace-nowrap">
                      <Rotulo>Monto</Rotulo>
                    </TableHead>
                    <TableHead className="w-36 text-center whitespace-nowrap">
                      <Rotulo>En blanco</Rotulo>
                    </TableHead>
                    <TableHead className="w-40 text-right whitespace-nowrap">
                      <Rotulo>Documento</Rotulo>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((grupo, i) => (
                    <Grupo key={grupo.dia}>
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
                              {grupo.resumen.cargas === 1 ? 'venta' : 'ventas'} ·{' '}
                              {dec(grupo.resumen.m3)} m³ · {$(grupo.resumen.facturado)}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                      {grupo.cargas.map((v) => (
                        <FilaVenta
                          key={v.id}
                          venta={v}
                          nombreCliente={nombreDe(v.clienteId)}
                          documento={documentoDe(v.id, documentos)}
                          recetas={RECETAS}
                        />
                      ))}
                    </Grupo>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setTodosLosDias(true)}
              className="border-line text-muted-foreground hover:text-ink hover:bg-sunk focus-visible:ring-ring/50 w-full border-t py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
            >
              Ver {restantes === 1 ? 'el día anterior' : `los ${num(restantes)} días anteriores`}
            </button>
          )}
        </section>

        <p className="text-faint mt-2 text-xs">
          Los papeles emitidos viven en el navegador que los emitió: hasta que exista la base
          de datos, un remito hecho en otra computadora no se ve acá.
        </p>
      </main>
    </>
  );
}

/** Las tres del producto, en orden fijo para el color. */
const RECETAS = ['H-21', 'H-25', 'H-30'];

/** Cuántos días se ven sin desplegar. */
const DIAS_A_LA_VISTA = 7;

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

/** Sin `<>` para poder llevar key en un grupo de filas de tabla. */
function Grupo({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function esHoy(dia: string) {
  return dia === diaLocal(new Date().toISOString());
}

function FilaVenta({
  venta: v,
  nombreCliente,
  documento,
  recetas,
}: {
  venta: Carga;
  nombreCliente: string | null;
  documento: Documento | null;
  recetas: string[];
}) {
  const corte = pesosDe(v);
  const pct = porcentajeFacturado(v);

  return (
    <TableRow>
      <TableCell className="num text-muted-foreground text-sm">{hora(v.momento)}</TableCell>
      <TableCell className="num text-sm font-medium">{v.id}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <MuestraReceta receta={v.receta} recetas={recetas} />
          <span className="num text-sm">{v.receta}</span>
        </span>
      </TableCell>
      <TableCell className="max-w-0 truncate text-sm">{nombreCliente ?? '—'}</TableCell>
      <TableCell className="text-right">
        <Cifra valor={dec(v.m3)} unidad="m³" tamano="sm" />
      </TableCell>
      <TableCell className="num text-right text-sm">{$(v.total)}</TableCell>
      <TableCell>
        {corte && pct !== null ? (
          <span
            className="flex items-center justify-center gap-2.5"
            title={`${$(corte.blanco)} facturado de ${$(v.total)}`}
          >
            <span className="num w-9 shrink-0 text-right text-xs">{pct}%</span>
            <BarraFiscal blanco={corte.blanco} negro={corte.negro} className="w-16 shrink-0" />
          </span>
        ) : (
          <span className="text-faint block text-center text-xs italic">sin definir</span>
        )}
      </TableCell>
      {/* Un solo lugar dice las dos cosas: si el papel existe, su número;
          si no, el camino para emitirlo. El emisor ya está construido y
          vive en el perfil del cliente — acá va el punto de entrada. */}
      <TableCell className="text-right">
        {documento ? (
          <Link
            href={`/documentos/${documento.numero}` as Route}
            className="border-ok/40 text-ok-text hover:bg-ok-soft num inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap transition-colors"
          >
            <FileText className="size-3 shrink-0" aria-hidden />
            {documento.numero}
          </Link>
        ) : (
          <Link
            href={`/clientes/${v.clienteId}/emitir?tipo=remito&carga=${v.id}` as Route}
            className="border-line text-muted-foreground hover:text-ink hover:bg-sunk inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors"
          >
            Emitir
          </Link>
        )}
      </TableCell>
    </TableRow>
  );
}
