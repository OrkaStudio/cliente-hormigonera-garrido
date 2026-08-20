'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, UserMinus, UserCheck } from 'lucide-react';

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
import { type ClienteConResumen, coincide, ordenarPorActividad } from '@/lib/dominio/clientes';
import { altaLocal, aplicarLocales, editarLocal } from '@/lib/datos/locales';
import type { Cliente } from '@/lib/datos/tipos';
import { $, dec, fechaDeMomento } from '@/lib/formato';
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
export function ListaClientes({ sembrados }: { sembrados: ClienteConResumen[] }) {
  // El primer render tiene que dar igual que el del servidor, así que los
  // cambios guardados en el navegador se aplican después de montar.
  const [clientes, setClientes] = useState(sembrados);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('activos');

  const [editando, setEditando] = useState<Cliente | null>(null);
  const [abriendoAlta, setAbriendoAlta] = useState(false);
  const [dandoBaja, setDandoBaja] = useState<ClienteConResumen | null>(null);

  function refrescar() {
    setClientes(ordenarPorActividad(aplicarLocales(sembrados)));
  }

  useEffect(refrescar, [sembrados]);

  const activos = clientes.filter((c) => c.activo);
  const inactivos = clientes.filter((c) => !c.activo);

  const visibles = useMemo(() => {
    const base = filtro === 'activos' ? activos : filtro === 'inactivos' ? inactivos : clientes;
    return base.filter((c) => coincide(c, busqueda));
  }, [filtro, busqueda, clientes, activos, inactivos]);

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
      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, contacto o CUIT"
          aria-label="Buscar clientes"
          className="h-9 w-full min-w-0 sm:max-w-xs sm:flex-1"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado
            valor={filtro}
            onCambio={setFiltro}
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
          {/* Escritorio: la tabla, que deja comparar una columna de un vistazo. */}
          <div className="border-line bg-card shadow-tarjeta mt-4 hidden overflow-hidden rounded-xl border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Última compra</TableHead>
                  <TableHead className="text-right">m³</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {c.nombre}
                      </Link>
                      {!c.activo && (
                        <Estado className="ml-2 align-middle">Inactivo</Estado>
                      )}
                      {c.contacto && (
                        <span className="text-faint ml-2 hidden text-xs lg:inline">
                          {c.contacto}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-faint text-right tabular-nums">
                      {c.resumen.ultimaCompra ? fechaDeMomento(c.resumen.ultimaCompra) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.resumen.m3 ? <Cifra valor={dec(c.resumen.m3)} tamano="sm" /> : <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.resumen.ventas || <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.resumen.facturado ? $(c.resumen.facturado) : <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditando(c)}
                          aria-label={`Editar ${c.nombre}`}
                          title="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDandoBaja(c)}
                          aria-label={
                            c.activo ? `Desactivar ${c.nombre}` : `Reactivar ${c.nombre}`
                          }
                          title={c.activo ? 'Desactivar' : 'Reactivar'}
                        >
                          {c.activo ? <UserMinus /> : <UserCheck />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Teléfono: tarjetas. Una tabla de cinco columnas no entra, y la
              versión que "entra" con scroll horizontal no se usa nunca. */}
          <ul className="mt-4 grid gap-2 sm:hidden">
            {visibles.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="border-line bg-card shadow-tarjeta block rounded-xl border p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-medium">{c.nombre}</span>
                    {!c.activo && <Estado>Inactivo</Estado>}
                  </div>
                  {c.contacto && <p className="text-faint mt-0.5 text-xs">{c.contacto}</p>}
                  <div className="mt-2.5 flex items-baseline gap-4 text-sm">
                    <Cifra valor={dec(c.resumen.m3)} unidad="m³" tamano="sm" />
                    <span className="text-faint text-xs">
                      {c.resumen.ventas} {c.resumen.ventas === 1 ? 'venta' : 'ventas'}
                    </span>
                    <span className="ml-auto tabular-nums">
                      {c.resumen.facturado ? $(c.resumen.facturado) : '—'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
