'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, Plus, Pencil, Store, UserMinus, UserCheck } from 'lucide-react';

import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { Estado } from '@/components/dominio/estado';
import { Cifra } from '@/components/dominio/cifra';
import { Segmentado } from '@/components/dominio/segmentado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ClienteConResumen,
  type Criterio,
  coincide,
  diasSinComprar,
  ordenarPorActividad,
  ordenarRanking,
  participacion,
  temperatura,
} from '@/lib/dominio/clientes';
import { altaLocal, aplicarLocales, editarLocal } from '@/lib/datos/locales';
import type { Cliente } from '@/lib/datos/tipos';
import { cn } from '@/lib/utils';
import { $, dec, fechaLargaDeMomento } from '@/lib/formato';
import { DialogoCliente, type DatosCliente } from './dialogo-cliente';
import { DialogoBaja } from './dialogo-baja';

/**
 * Apartado 4 — la lista de clientes.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-4-clientes.md
 *
 * Ordenada por actividad, no alfabéticamente: el que compró la semana
 * pasada es el que se va a buscar hoy. Alfabético obliga a recorrer una
 * lista para encontrar a alguien que ya se sabe quién es.
 *
 * Los números de cada fila no están guardados en ninguna columna: se
 * calculan de las cargas. Un acumulado guardado se desincroniza el día
 * que alguien anula una carga vieja, y nadie se entera.
 */
export function ListaClientes({
  sembrados,
  totalM3,
}: {
  sembrados: ClienteConResumen[];
  /** Los m³ de toda la planta: el denominador de la participación. */
  totalM3: number;
}) {
  // El primer render tiene que dar igual que el del servidor, así que los
  // cambios guardados en el navegador se aplican después de montar.
  const [clientes, setClientes] = useState(sembrados);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('activos');
  const [criterio, setCriterio] = useState<Criterio>('volumen');

  const [editando, setEditando] = useState<Cliente | null>(null);
  const [abriendoAlta, setAbriendoAlta] = useState(false);
  const [dandoBaja, setDandoBaja] = useState<ClienteConResumen | null>(null);

  function refrescar() {
    setClientes(ordenarPorActividad(aplicarLocales(sembrados)));
  }

  useEffect(refrescar, [sembrados]);

  const activos = clientes.filter((c) => c.activo);
  const inactivos = clientes.filter((c) => !c.activo);

  const { ranking, genericos } = useMemo(() => {
    const base = filtro === 'activos' ? activos : filtro === 'inactivos' ? inactivos : clientes;
    return ordenarRanking(base.filter((c) => coincide(c, busqueda)), criterio);
  }, [filtro, busqueda, criterio, clientes, activos, inactivos]);

  const visibles = [...ranking, ...genericos];

  function guardar(datos: DatosCliente) {
    if (editando) {
      editarLocal(editando.id, datos);
    } else {
      altaLocal(datos);
    }
    setEditando(null);
    setAbriendoAlta(false);
    refrescar();
  }

  function alternarActivo(cliente: ClienteConResumen) {
    editarLocal(cliente.id, { activo: !cliente.activo });
    setDandoBaja(null);
    refrescar();
  }

  return (
    <>
      {/* Buscar y filtrar viven juntos en superficie hundida: son los
          controles de la lista, no parte de ella. */}
      <div className="border-line bg-sunk mt-5 grid gap-3 rounded-xl border p-3 sm:flex sm:flex-wrap sm:items-center">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, contacto o CUIT"
          aria-label="Buscar clientes"
          className="bg-card h-9 w-full min-w-0 sm:max-w-xs sm:flex-1"
        />
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <Segmentado
            valor={filtro}
            onCambio={setFiltro}
            className="bg-card"
            opciones={[
              { valor: 'activos', etiqueta: 'Activos', cantidad: activos.length },
              { valor: 'inactivos', etiqueta: 'Inactivos', cantidad: inactivos.length },
              { valor: 'todos', etiqueta: 'Todos', cantidad: clientes.length },
            ]}
          />
          <Button onClick={() => setAbriendoAlta(true)} className="ml-auto" size="lg">
            <Plus data-icon="inline-start" />
            Nuevo cliente
          </Button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          className="mt-6"
          titulo={busqueda ? 'Ningún cliente coincide' : 'Todavía no hay clientes acá'}
          descripcion={
            busqueda
              ? `No hay nadie que coincida con "${busqueda}". Probá con parte del nombre o con el CUIT.`
              : 'Los clientes se cargan a mano. Cuando exista Cargas, cada uno va a empezar a acumular sus ventas solo.'
          }
          accion={
            busqueda ? (
              <Button variant="outline" onClick={() => setBusqueda('')}>
                Limpiar la búsqueda
              </Button>
            ) : (
              <Button onClick={() => setAbriendoAlta(true)}>Dar de alta el primero</Button>
            )
          }
        />
      ) : (
        <>
          <h2 className="rotulo-obra text-muted-foreground mt-6 font-mono text-xs tracking-widest uppercase">
            {filtro === 'activos' ? 'Activos' : filtro === 'inactivos' ? 'Inactivos' : 'Todos'}
            <span className="text-faint normal-case">
              · orden por {criterio === 'volumen' ? 'volumen' : 'facturado'}
            </span>
          </h2>

          {/* Escritorio: la tabla, que deja comparar una columna de un vistazo. */}
          <div className="border-line bg-card shadow-tarjeta mt-3 hidden overflow-hidden rounded-xl border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-20 text-right">Ventas</TableHead>
                  <TableHead className="w-64">
                    <Ordenar por="volumen" criterio={criterio} onCambio={setCriterio}>
                      Volumen
                    </Ordenar>
                  </TableHead>
                  <TableHead className="w-40 text-right">
                    <Ordenar por="facturado" criterio={criterio} onCambio={setCriterio}>
                      Facturado
                    </Ordenar>
                  </TableHead>
                  <TableHead className="w-32 text-right">Última compra</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((c) => (
                  <Fila
                    key={c.id}
                    c={c}
                    totalM3={totalM3}
                    onEditar={setEditando}
                    onBaja={setDandoBaja}
                  />
                ))}
                {/* La venta suelta al pie y fuera del orden: no es un
                    cliente, es la suma de todos los que no justificaron
                    darlos de alta. Si encabezara el ranking, "mi cliente
                    más importante" dejaría de significar algo. */}
                {genericos.map((c) => (
                  <Fila
                    key={c.id}
                    c={c}
                    totalM3={totalM3}
                    onEditar={setEditando}
                    onBaja={setDandoBaja}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Teléfono: una fila compacta por cliente. Una tabla de seis
              columnas no entra, y la que "entra" con scroll lateral no la
              usa nadie. */}
          <ul className="border-line bg-card shadow-tarjeta divide-line mt-3 divide-y overflow-hidden rounded-xl border sm:hidden">
            {ranking.map((c) => (
              <FilaMovil key={c.id} c={c} totalM3={totalM3} />
            ))}
          </ul>
          {genericos.map((c) => (
            <ul
              key={c.id}
              className="border-line bg-card shadow-tarjeta mt-2 overflow-hidden rounded-xl border sm:hidden"
            >
              <FilaMovil c={c} totalM3={totalM3} />
            </ul>
          ))}
        </>
      )}

      <DialogoCliente
        abierto={abriendoAlta || Boolean(editando)}
        cliente={editando}
        onCerrar={() => {
          setAbriendoAlta(false);
          setEditando(null);
        }}
        onGuardar={guardar}
        nombresExistentes={clientes.map((c) => c.nombre)}
      />

      <DialogoBaja
        cliente={dandoBaja}
        onCerrar={() => setDandoBaja(null)}
        onConfirmar={alternarActivo}
      />
    </>
  );
}

/**
 * El encabezado que además ordena.
 *
 * Los dos criterios NO dan el mismo orden, y por eso se puede cambiar:
 * un cliente que compra recetas caras factura más llevando menos
 * metros. Con la semilla de hoy, Corralón lleva un m³ menos que
 * Constructora y deja casi trescientos mil pesos más.
 */
function Ordenar({
  por,
  criterio,
  onCambio,
  children,
}: {
  por: Criterio;
  criterio: Criterio;
  onCambio: (c: Criterio) => void;
  children: React.ReactNode;
}) {
  const activo = por === criterio;
  return (
    <button
      type="button"
      onClick={() => onCambio(por)}
      aria-pressed={activo}
      className={cn(
        'focus-visible:ring-ring/50 -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
        activo ? 'text-ink' : 'text-faint hover:text-ink',
      )}
    >
      {children}
      <ArrowDown className={cn('size-3 transition-opacity', activo ? 'opacity-100' : 'opacity-0')} aria-hidden />
    </button>
  );
}

/**
 * Hace cuántos días que no compra.
 *
 * La pregunta no es "¿qué día compró?" sino "¿hace cuánto que no lo
 * veo?", así que va en días y no en fecha. El color aparece recién
 * cuando alguien se está yendo de verdad: pintar de ámbar una compra de
 * hace tres días inventa una alarma que no existe.
 */
function UltimaCompra({ momento, corto = false }: { momento: string | null; corto?: boolean }) {
  const dias = diasSinComprar(momento);
  if (dias === null) return <span className="text-faint">—</span>;

  const temp = temperatura(dias);
  return (
    <span
      className={cn(
        'num text-sm whitespace-nowrap',
        temp === 'frio' ? 'text-danger-text font-medium' : temp === 'tibio' ? 'text-warn-text' : 'text-faint',
      )}
      title={momento ? fechaLargaDeMomento(momento) : undefined}
    >
      {dias === 0
        ? 'hoy'
        : dias === 1
          ? 'ayer'
          : /* En el teléfono la fila tiene cuatro datos y "hace 32 días"
               los parte en dos líneas. */
            corto
            ? `${dias} d`
            : `hace ${dias} días`}
    </span>
  );
}

/**
 * La barra mide contra el total de la planta, no contra el más grande.
 *
 * "Casi tanto como el primero" no sirve para decidir nada. "El 19% de lo
 * que sale de la planta" dice cuánto se depende de este cliente — y
 * cuando todas las barras salen cortas y parecidas, ese ES el mensaje:
 * ningún cliente la sostiene solo.
 */
function Participacion({ m3, totalM3, atenuada = false }: { m3: number; totalM3: number; atenuada?: boolean }) {
  const pct = participacion(m3, totalM3);
  return (
    <span className="flex items-center gap-2.5">
      <Cifra valor={dec(m3)} tamano="sm" atenuado={atenuada} className="w-14 shrink-0 justify-end" />
      <span className="bg-sunk relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', atenuada ? 'bg-faint' : 'bg-s1')}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </span>
      <span className="num text-faint w-8 shrink-0 text-xs">{pct.toFixed(0)}%</span>
    </span>
  );
}

function Fila({
  c,
  totalM3,
  onEditar,
  onBaja,
}: {
  c: ClienteConResumen;
  totalM3: number;
  onEditar: (c: Cliente) => void;
  onBaja: (c: ClienteConResumen) => void;
}) {
  return (
    /* Toda la fila entra al cliente. El link sigue siendo un <a> de
       verdad y se estira con ::after sobre la fila, en vez de un
       onClick: así ctrl+click y click del medio siguen abriendo en
       pestaña nueva, y el foco por teclado cae en un solo lugar. Los
       botones de la derecha se levantan con z-10 para quedar encima. */
    <TableRow
      className={cn('group relative cursor-pointer', c.generico && 'border-line-strong border-t-2')}
    >
      <TableCell>
        <span className="flex items-center gap-2">
          {c.generico && <Store className="text-faint size-4 shrink-0" aria-hidden />}
          <Link
            href={`/clientes/${c.id}`}
            className="font-medium underline-offset-4 group-hover:underline after:absolute after:inset-0 after:content-['']"
          >
            {c.nombre}
          </Link>
          {!c.activo && <Estado>Inactivo</Estado>}
        </span>
        <span className="text-faint mt-0.5 block text-xs">
          {c.generico ? 'Venta suelta · no compite en el ranking' : (c.contacto ?? '—')}
        </span>
      </TableCell>
      <TableCell className="num text-right text-sm">
        {c.resumen.ventas || <span className="text-faint">—</span>}
      </TableCell>
      <TableCell>
        {c.resumen.m3 ? (
          <Participacion m3={c.resumen.m3} totalM3={totalM3} atenuada={c.generico} />
        ) : (
          <span className="text-faint">—</span>
        )}
      </TableCell>
      <TableCell className="num text-right">
        {c.resumen.facturado ? $(c.resumen.facturado) : <span className="text-faint">—</span>}
      </TableCell>
      <TableCell className="text-right">
        {c.generico ? (
          <span className="text-faint">—</span>
        ) : (
          <UltimaCompra momento={c.resumen.ultimaCompra} />
        )}
      </TableCell>
      <TableCell>
        {/* z-10: por encima del link estirado de la fila. */}
        <div className="relative z-10 flex justify-end gap-0.5">
          {!c.generico && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEditar(c)}
                aria-label={`Editar ${c.nombre}`}
                title="Editar"
              >
                <Pencil />
              </Button>
              {/* Desactivar, nunca borrar: el historial de ventas queda.
                  Por eso una persona con un menos, y no un tacho. */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onBaja(c)}
                aria-label={c.activo ? `Desactivar ${c.nombre}` : `Reactivar ${c.nombre}`}
                title={c.activo ? 'Desactivar' : 'Reactivar'}
              >
                {c.activo ? <UserMinus /> : <UserCheck />}
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** En el teléfono cada cliente entra en dos líneas, no en una tarjeta. */
function FilaMovil({ c, totalM3 }: { c: ClienteConResumen; totalM3: number }) {
  const pct = participacion(c.resumen.m3, totalM3);
  return (
    <li>
      <Link href={`/clientes/${c.id}`} className="block px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {c.generico && <Store className="text-faint size-3.5 shrink-0" aria-hidden />}
            <span className="truncate font-medium">{c.nombre}</span>
          </span>
          {!c.activo && <Estado>Inactivo</Estado>}
        </div>
        <p className="text-faint mt-0.5 truncate text-xs">
          {c.generico ? 'Venta suelta' : (c.contacto ?? '—')}
        </p>
        <div className="mt-2 flex items-baseline gap-3 text-sm">
          <Cifra valor={dec(c.resumen.m3)} unidad="m³" tamano="sm" atenuado={c.generico} />
          <span className="num text-faint text-xs">{pct.toFixed(0)}%</span>
          <span className="num">{c.resumen.facturado ? $(c.resumen.facturado) : '—'}</span>
          <span className="ml-auto">
            {c.generico ? null : <UltimaCompra momento={c.resumen.ultimaCompra} corto />}
          </span>
        </div>
      </Link>
    </li>
  );
}
