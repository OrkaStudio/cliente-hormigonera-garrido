'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Pencil, Receipt, UserCheck, UserMinus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Cifra } from '@/components/dominio/cifra';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { Estado, MarcaFiscalDeVenta } from '@/components/dominio/estado';
import { DialogoDocumento } from './dialogo-documento';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { Button } from '@/components/ui/button';
import { buscarLocal, editarLocal, parcheLocal } from '@/lib/datos/locales';
import type { Carga } from '@/lib/datos/tipos';
import type { TipoDocumento } from '@/lib/dominio/documentos';
import type { PerfilCliente as Perfil } from '@/lib/datos/clientes';
import { porcentajeEnBlanco } from '@/lib/dominio/clientes';
import { $, dec, fechaDeMomento, fechaLargaDeMomento, hora, num } from '@/lib/formato';
import { DialogoBaja } from './dialogo-baja';
import { DialogoCliente, type DatosCliente } from './dialogo-cliente';

/**
 * El perfil de un cliente.
 *
 * Todo lo que muestra sale de sus cargas asignadas (R3): una carga sin
 * cliente no le suma a nadie, y una anulada tampoco. No hay ni un número
 * guardado en una columna.
 *
 * Falta el margen, que el criterio de terminado del apartado pide. Para
 * calcularlo hace falta el costo de los materiales de cada receta, que
 * es el apartado 5 y todavía no existe. Preferimos que falte a inventarlo:
 * un margen que no es el margen hace que José deje de creerle al sistema
 * entero.
 */
export function PerfilCliente({ perfil, id }: { perfil: Perfil | null; id: string }) {
  // Igual que en la lista: primer render idéntico al del servidor, y los
  // cambios guardados en el navegador se aplican después de montar.
  const [datos, setDatos] = useState<Perfil | null>(perfil);
  const [montado, setMontado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [dandoBaja, setDandoBaja] = useState(false);
  /** Que documento se esta emitiendo, y de que carga si sale de una. */
  const [documento, setDocumento] = useState<{
    tipo: TipoDocumento;
    carga?: Carga;
  } | null>(null);

  function refrescar() {
    if (perfil) {
      setDatos({ ...perfil, ...parcheLocal(id) });
      return;
    }
    // No está en la semilla: puede ser uno dado de alta en este navegador.
    const local = buscarLocal(id);
    setDatos(local ? { ...local, ventas: [] } : null);
  }

  useEffect(() => {
    setMontado(true);
    refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, id]);

  if (!datos) {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
        <Volver />
        <EstadoVacio
          className="mt-6"
          titulo={montado ? 'Este cliente no existe' : 'Buscando…'}
          descripcion={
            montado
              ? 'Puede haber sido dado de alta en otra computadora: mientras no haya base de datos, cada navegador guarda los suyos.'
              : undefined
          }
          accion={
            montado ? (
              <Button variant="outline" render={<Link href="/clientes" />}>
                Volver a Clientes
              </Button>
            ) : undefined
          }
        />
      </main>
    );
  }

  const { resumen } = datos;
  const blanco = porcentajeEnBlanco(resumen);
  const definidas = resumen.definidas;

  function guardar(nuevos: DatosCliente) {
    editarLocal(id, nuevos);
    setEditando(false);
    refrescar();
  }

  function alternarActivo() {
    editarLocal(id, { activo: !datos!.activo });
    setDandoBaja(false);
    refrescar();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
      <Volver />

      <EncabezadoPagina
        className="mt-3"
        titulo={datos.nombre}
        bajada={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {!datos.activo && <Estado>Inactivo</Estado>}
            {datos.generico && <Estado>Venta suelta</Estado>}
            {datos.contacto && <span>{datos.contacto}</span>}
            {datos.telefono && <span className="tabular-nums">{datos.telefono}</span>}
            {datos.generico ? (
              <span>
                El comprador esporádico que no justifica darle de alta un perfil. No se
                edita ni se desactiva: si se apaga, las ventas sueltas se quedan sin dónde
                caer.
              </span>
            ) : (
              !datos.contacto &&
              !datos.telefono &&
              datos.activo && <span>Sin datos de contacto cargados.</span>
            )}
          </span>
        }
        acciones={
          <>
            <Button variant="outline" onClick={() => setDocumento({ tipo: 'presupuesto' })}>
              <FileText data-icon="inline-start" />
              Presupuesto
            </Button>
            {datos.generico ? null : (
              <>
                <Button variant="outline" onClick={() => setEditando(true)}>
                <Pencil data-icon="inline-start" />
                Editar
              </Button>
                <Button variant="ghost" onClick={() => setDandoBaja(true)}>
                  {datos.activo ? (
                    <>
                      <UserMinus data-icon="inline-start" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <UserCheck data-icon="inline-start" />
                      Reactivar
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <TarjetaKpi
          rotulo="Comprados"
          valor={dec(resumen.m3)}
          unidad="m³"
          pie={
            resumen.recetaFrecuente
              ? `Sobre todo ${resumen.recetaFrecuente}`
              : 'Todavía no compró'
          }
        />
        <TarjetaKpi
          rotulo="Ventas"
          valor={num(resumen.ventas)}
          pie={
            resumen.ultimaCompra
              ? `La última, el ${fechaLargaDeMomento(resumen.ultimaCompra)}`
              : 'Sin cargas asignadas'
          }
        />
        <TarjetaKpi
          rotulo="Facturado"
          valor={$(resumen.facturado)}
          pie="Suma de las cargas que tiene asignadas"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Sus cargas
          </h2>

          {datos.ventas.length === 0 ? (
            <EstadoVacio
              className="mt-3"
              titulo="Todavía no tiene cargas asignadas"
              descripcion="Cuando exista el apartado de Cargas, las que se le asignen van a aparecer acá y los números de arriba se van a mover solos."
            />
          ) : (
            <ul className="border-line bg-panel mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border">
              {datos.ventas.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
                  <span className="text-muted-foreground w-11 font-mono text-sm tabular-nums">
                    {fechaDeMomento(v.momento)}
                  </span>
                  <span className="text-faint hidden w-10 font-mono text-xs tabular-nums sm:inline">
                    {hora(v.momento)}
                  </span>
                  <span className="text-faint w-12 font-mono text-xs">{v.receta}</span>
                  <Cifra valor={v.m3} unidad="m³" tamano="sm" />
                  <span className="ml-auto text-sm tabular-nums whitespace-nowrap">
                    {v.total ? $(v.total) : <span className="text-faint">—</span>}
                  </span>
                  <span className="w-16 text-right">
                    <MarcaFiscalDeVenta venta={v} />
                  </span>
                  {/* Un remito por carga. Sale de acá y no de una pantalla
                      aparte porque es donde Jose mira cuando el cliente
                      llama pidiendo el papel de una entrega puntual. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDocumento({ tipo: 'remito', carga: v })}
                    aria-label={`Emitir remito de la carga del ${fechaDeMomento(v.momento)}`}
                    title="Emitir remito"
                  >
                    <Receipt />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="grid min-w-0 content-start gap-4">
          <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
            <h3 className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
              Datos
            </h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <Dato rotulo="Dirección" valor={datos.direccion} />
              <Dato rotulo="CUIT" valor={datos.cuit} mono />
              <Dato rotulo="Mail" valor={datos.mail} />
              <Dato rotulo="Teléfono" valor={datos.telefono} mono />
            </dl>
            {datos.notas && (
              <p className="text-faint border-line mt-3 border-t pt-3 text-sm">
                {datos.notas}
              </p>
            )}
          </div>

          {/* Blanco / negro. Es un dato sensible: la sospecha de la spec es
              que el operador de planta no tiene que verlo. Los permisos se
              definen con José, así que por ahora se muestra sin gatear. */}
          <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
            <h3 className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
              Blanco y negro
            </h3>
            {blanco === null ? (
              <p className="text-faint mt-2 text-sm">
                Ninguna de sus ventas tiene el corte definido todavía.
              </p>
            ) : (
              <>
                <p className="num mt-2 text-2xl">
                  {blanco}
                  <span className="text-faint text-base">% en blanco</span>
                </p>
                <ProporcionFiscal blanco={resumen.blanco} negro={resumen.negro} />
                <p className="text-faint mt-2 text-xs">
                  {$(resumen.blanco)} en blanco y {$(resumen.negro)} en negro, sobre{' '}
                  {definidas} {definidas === 1 ? 'venta' : 'ventas'} con el corte definido.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>

      <DialogoCliente
        abierto={editando}
        cliente={datos}
        onCerrar={() => setEditando(false)}
        onGuardar={guardar}
      />
      {documento && (
        <DialogoDocumento
          abierto
          tipo={documento.tipo}
          carga={documento.carga}
          cliente={datos}
          onCerrar={() => setDocumento(null)}
        />
      )}
      <DialogoBaja
        cliente={dandoBaja ? datos : null}
        onCerrar={() => setDandoBaja(false)}
        onConfirmar={alternarActivo}
      />
    </main>
  );
}

/** La barra son pesos, no cantidad de ventas. Ver ResumenCliente. */
function ProporcionFiscal({ blanco, negro }: { blanco: number; negro: number }) {
  const total = blanco + negro;
  if (!total) return null;

  return (
    <div
      className="border-line mt-2 flex h-2.5 overflow-hidden rounded-full border"
      role="img"
      aria-label={`${$(blanco)} de ${$(total)} en blanco`}
    >
      <div className="bg-white" style={{ width: `${(blanco / total) * 100}%` }} />
      <div className="bg-ink" style={{ width: `${(negro / total) * 100}%` }} />
    </div>
  );
}

function Volver() {
  return (
    <Link
      href="/clientes"
      className="text-faint hover:text-ink inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-3.5" />
      Clientes
    </Link>
  );
}

function Dato({
  rotulo,
  valor,
  mono = false,
}: {
  rotulo: string;
  valor: string | null;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-baseline gap-2">
      <dt className="text-faint text-xs">{rotulo}</dt>
      <dd
        className={cn(
          'min-w-0 [overflow-wrap:anywhere]',
          valor ? (mono ? 'font-mono text-sm tabular-nums' : '') : 'text-faint',
        )}
      >
        {valor ?? 'Sin cargar'}
      </dd>
    </div>
  );
}
