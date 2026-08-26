'use client';

import { useMemo, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { Cifra } from '@/components/dominio/cifra';
import { Estado } from '@/components/dominio/estado';
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
import type { DatosVentas, PedidoConAvance } from '@/lib/datos/ventas';
import { coincidePedido } from '@/lib/dominio/pedidos';
import { $, dec, fechaLargaDeMomento, hora, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Apartado 3 — Ventas.
 *
 * Una venta es un PEDIDO, no un pastón. Antes esta pantalla listaba
 * exactamente las mismas filas que Cargas —siete de ocho columnas
 * iguales— porque el modelo decía que una carga era una venta. Los datos
 * lo desmentían: a Obras Monte SA le salieron 18 m³ en tres pastones y
 * figuraban como tres ventas.
 * → decisiones/hormigonera-el-pedido-es-la-venta
 *
 * Nada fiscal: los papeles que salen de acá son comprobantes comerciales
 * → decisiones/hormigonera-plataforma-sin-fiscal
 */
export function PanelVentas({ datos: d }: { datos: DatosVentas }) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<'todos' | 'abierto' | 'completo'>('todos');

  const visibles = useMemo(
    () =>
      d.pedidos.filter(
        (p) =>
          coincidePedido(p, p.clienteNombre, busqueda) &&
          (estado === 'todos' || p.estadoReal === estado),
      ),
    [d.pedidos, busqueda, estado],
  );

  const abiertos = d.pedidos.filter((p) => p.estadoReal === 'abierto');

  const total = useMemo(
    () => ({
      pedido: d.pedidos.reduce((a, p) => a + p.m3, 0),
      producido: d.pedidos.reduce((a, p) => a + p.avance.producido, 0),
      facturado: d.pedidos.reduce((a, p) => a + p.avance.total, 0),
      pendiente: abiertos.reduce((a, p) => a + p.avance.pendiente, 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.pedidos],
  );

  const hayFiltro = busqueda.trim() !== '' || estado !== 'todos';

  /* Un mes son cien y pico de pedidos. Se ven los más nuevos —donde
     están los abiertos, que son los que piden acción— y el resto está a
     un clic. Con un filtro puesto se muestran todos: si alguien buscó,
     quiere ver lo que encontró. */
  const [todos, setTodos] = useState(false);
  const enPantalla = hayFiltro || todos ? visibles : visibles.slice(0, A_LA_VISTA);
  const restantes = visibles.length - enPantalla.length;

  return (
    <>
      <BarraSuperior activo="Ventas" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Ventas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Lo que cada cliente encargó, y cuánto de eso ya salió de la planta. Desde el{' '}
          {fechaLargaDeMomento(d.desde)}.
        </p>

        <p className="border-line bg-sunk text-muted-foreground mt-4 rounded-lg border border-dashed px-4 py-2.5 text-xs">
          Un pedido es <span className="text-ink">una venta</span>, aunque salga en varios
          pastones: 18 m³ para un cliente son un pedido y tres cargas. El precio se acuerda una
          vez, al tomarlo.
        </p>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato rotulo="Pedidos">
            <Cifra valor={num(d.pedidos.length)} tamano="lg" />
            <p className="text-faint mt-1 text-xs">
              {num(abiertos.length)} {abiertos.length === 1 ? 'abierto' : 'abiertos'}
            </p>
          </Dato>

          <Dato rotulo="Encargado">
            <Cifra valor={dec(total.pedido)} unidad="m³" tamano="lg" />
            <p className="text-faint mt-1 text-xs">
              salieron <span className="num">{dec(total.producido)}</span> m³
            </p>
          </Dato>

          <Dato rotulo="Falta producir">
            <Cifra
              valor={dec(total.pendiente)}
              unidad="m³"
              tamano="lg"
              tono={total.pendiente > 0 ? 'warn' : 'neutro'}
            />
            <p className="text-faint mt-1 text-xs">
              {abiertos.length === 0 ? 'todo entregado' : 'en pedidos abiertos'}
            </p>
          </Dato>

          <Dato rotulo="Facturado">
            <Cifra valor={$(total.facturado)} tamano="lg" />
            <p className="text-faint mt-1 text-xs">
              por lo producido, no por lo pedido
              {d.sinImputar > 0 && (
                <>
                  {' · '}
                  <Link
                    href="/cargas"
                    className="text-warn-text underline-offset-2 hover:underline"
                  >
                    {num(d.sinImputar)} sin imputar
                  </Link>
                </>
              )}
            </p>
          </Dato>
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
                  placeholder="Pedido, cliente u obra"
                  className="h-9 w-full pl-8 sm:w-64"
                />
              </span>
            </Filtro>

            <Filtro rotulo="Estado" htmlFor="estado">
              <select
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as typeof estado)}
                className="border-line bg-card focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="todos">Todos</option>
                <option value="abierto">Abiertos</option>
                <option value="completo">Completos</option>
              </select>
            </Filtro>
          </div>

          {visibles.length === 0 ? (
            <EstadoVacio
              className="m-4"
              titulo={hayFiltro ? 'Ningún pedido coincide' : 'Todavía no hay pedidos'}
              descripcion={
                hayFiltro
                  ? 'Probá con otro número, otro cliente o sacá el filtro de estado.'
                  : 'Un pedido se toma cuando el cliente llama, antes de que la planta produzca.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sunk">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">
                      <Rotulo>Pedido</Rotulo>
                    </TableHead>
                    <TableHead className="w-full min-w-40">
                      <Rotulo>Cliente</Rotulo>
                    </TableHead>
                    <TableHead className="w-24">
                      <Rotulo>Receta</Rotulo>
                    </TableHead>
                    <TableHead className="w-52 text-center whitespace-nowrap">
                      <Rotulo>Producido</Rotulo>
                    </TableHead>
                    <TableHead className="w-28 text-right whitespace-nowrap">
                      <Rotulo>Precio /m³</Rotulo>
                    </TableHead>
                    <TableHead className="w-32 text-right whitespace-nowrap">
                      <Rotulo>A cobrar</Rotulo>
                    </TableHead>
                    <TableHead className="w-28 text-right">
                      <Rotulo>Estado</Rotulo>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enPantalla.map((p) => (
                    <FilaPedido key={p.id} pedido={p} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setTodos(true)}
              className="border-line text-muted-foreground hover:text-ink hover:bg-sunk focus-visible:ring-ring/50 w-full border-t py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
            >
              Ver {restantes === 1 ? 'el pedido anterior' : `los ${num(restantes)} pedidos anteriores`}
            </button>
          )}
        </section>

        <p className="text-faint mt-2 text-xs">
          Los pastones se imputan al pedido desde{' '}
          <Link href="/cargas" className="underline-offset-2 hover:underline">
            Cargas
          </Link>
          . El registro que llega del autómata trae receta, volumen y hora, pero{' '}
          <span className="text-ink-soft">no trae el pedido</span>: hasta que eso se resuelva
          con el integrador, la imputación es a mano.
        </p>
      </main>
    </>
  );
}

const RECETAS = ['H-21', 'H-25', 'H-30'];

/** Cuántos pedidos se ven sin desplegar. */
const A_LA_VISTA = 25;

function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        {rotulo}
      </p>
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

function FilaPedido({ pedido: p }: { pedido: PedidoConAvance }) {
  const { avance } = p;

  return (
    <TableRow className="group relative cursor-pointer">
      <TableCell>
        {/* Toda la fila entra al cliente: el link se estira con ::after
            para que ctrl+click siga abriendo en pestaña nueva. */}
        <Link
          href={`/clientes/${p.clienteId}` as Route}
          className="num text-sm font-medium underline-offset-4 group-hover:underline after:absolute after:inset-0 after:content-['']"
        >
          {p.id}
        </Link>
        <span className="text-faint num mt-0.5 block text-xs">{hora(p.creado)}</span>
      </TableCell>
      <TableCell className="max-w-0 truncate text-sm">
        {p.clienteNombre}
        {p.obra && <span className="text-faint block truncate text-xs">{p.obra}</span>}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <MuestraReceta receta={p.receta} recetas={RECETAS} />
          <span className="num text-sm">{p.receta}</span>
        </span>
      </TableCell>
      {/* Lo producido contra lo pedido: es la pregunta de la pantalla. */}
      <TableCell>
        <span className="flex items-center justify-center gap-2.5">
          <span className="num w-28 shrink-0 text-right text-xs whitespace-nowrap">
            {dec(avance.producido)} / {dec(p.m3)}
            <span className="text-faint ml-0.5">m³</span>
          </span>
          <span className="bg-sunk relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
            <span
              className={cn(
                'absolute inset-y-0 left-0 rounded-full',
                avance.pendiente > 0 ? 'bg-warn' : 'bg-ok',
              )}
              style={{ width: `${Math.max(avance.pct, 2)}%` }}
            />
          </span>
        </span>
      </TableCell>
      <TableCell className="num text-right text-sm">{$(p.precioM3)}</TableCell>
      <TableCell className="num text-right text-sm">{$(avance.total)}</TableCell>
      <TableCell className="text-right">
        <span className="relative z-10">
          {p.estadoReal === 'cancelado' ? (
            <Estado tono="danger">Cancelado</Estado>
          ) : p.estadoReal === 'completo' ? (
            <Estado tono="ok">Completo</Estado>
          ) : (
            <Estado tono="warn">
              faltan {dec(avance.pendiente)} m³
            </Estado>
          )}
        </span>
      </TableCell>
    </TableRow>
  );
}
