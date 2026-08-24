'use client';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Pencil, Receipt, UserCheck, UserMinus } from 'lucide-react';
import { Cifra } from '@/components/dominio/cifra';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { Estado, MarcaFiscalDeVenta } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { DocumentosDelCliente } from '@/components/clientes/documentos-del-cliente';
import { FichaContacto } from '@/components/clientes/ficha-contacto';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { Button } from '@/components/ui/button';
import { buscarLocal, editarLocal, parcheLocal } from '@/lib/datos/locales';
import type { PerfilCliente as Perfil } from '@/lib/datos/clientes';
import { diasSinComprar, porcentajeEnBlanco } from '@/lib/dominio/clientes';
import { $, dec, fechaDeMomento, fechaLargaDeMomento, hora, num } from '@/lib/formato';
import { DialogoBaja } from './dialogo-baja';
import { DialogoCliente, type DatosCliente } from './dialogo-cliente';
/**
 * Cuántas cargas se ven sin desplegar.
 *
 * El historial completo son noventa y nueve ventas listadas de corrido:
 * nueve mil doscientos píxeles en el teléfono, once pantallas, para un
 * bloque que José mira cuando el cliente llama por UNA entrega puntual.
 * Las últimas cinco contestan "¿qué me compró últimamente?" y el resto
 * está a un clic.
 */
const A_LA_VISTA = 5;

/** "hoy", "ayer", "hace 12 días". La misma voz que la lista. */
function textoDeDias(dias: number | null): string {
  if (dias === null) return 'sin compras';
  return dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
}

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
  const [todas, setTodas] = useState(false);
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
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
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
              <Button nativeButton={false} variant="outline" render={<Link href="/clientes" />}>
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
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
      <Volver />
      <EncabezadoPagina
        className="mt-3"
        titulo={datos.nombre}
        bajada={
          /* El contacto y el teléfono se fueron a la ficha del costado:
             estaban acá Y allá, y repetidos no ganan presencia, la
             pierden. Acá queda sólo lo que califica al cliente. */
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {!datos.activo && <Estado tono="warn">Inactivo</Estado>}
            {datos.generico && <Estado>Venta suelta</Estado>}
            {datos.generico && (
              <span className="text-muted-foreground text-sm">
                El comprador esporádico que no justifica darle de alta un perfil.
              </span>
            )}
          </span>
        }
        acciones={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/clientes/${id}/emitir?tipo=presupuesto` as Route} />}
            >
              <FileText data-icon="inline-start" />
              Hacer presupuesto
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
              ? `La última, ${textoDeDias(diasSinComprar(resumen.ultimaCompra))} · ${fechaLargaDeMomento(resumen.ultimaCompra)}`
              : 'Sin cargas asignadas'
          }
        />
        <TarjetaKpi
          rotulo="Facturado"
          valor={$(resumen.facturado)}
          pie="Suma de las cargas que tiene asignadas"
        />
      </div>
      {/* En el teléfono el contacto va PRIMERO. Antes vivía al final de
          la columna, o sea después de noventa y nueve cargas: para
          llamar al cliente había que recorrer nueve mil píxeles. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="order-2 min-w-0 lg:order-1">
          <div className="border-line bg-card shadow-tarjeta overflow-hidden rounded-lg border">
          <div className="px-4 pt-4">
          <h2 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
            Sus cargas
            {datos.ventas.length > A_LA_VISTA && (
              <span className="text-faint normal-case">
                · {todas ? `las ${num(datos.ventas.length)}` : `últimas ${A_LA_VISTA} de ${num(datos.ventas.length)}`}
              </span>
            )}
          </h2>
          </div>
          {datos.ventas.length === 0 ? (
            <EstadoVacio
              className="m-4 mt-3"
              titulo="Todavía no tiene cargas asignadas"
              descripcion="Cuando exista el apartado de Cargas, las que se le asignen van a aparecer acá y los números de arriba se van a mover solos."
            />
          ) : (
            <ul className="border-line mt-3 divide-y divide-[var(--line)] border-t">
              {(todas ? datos.ventas : datos.ventas.slice(0, A_LA_VISTA)).map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 p-3.5 sm:gap-x-3">
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
                  <span className="hidden w-16 text-right sm:inline">
                    <MarcaFiscalDeVenta venta={v} />
                  </span>
                  {/* Un remito por carga. Sale de acá y no de una pantalla
                      aparte porque es donde Jose mira cuando el cliente
                      llama pidiendo el papel de una entrega puntual. */}
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <Link
                        href={`/clientes/${id}/emitir?tipo=remito&carga=${v.id}` as Route}
                      />
                    }
                    aria-label={`Emitir remito de la carga del ${fechaDeMomento(v.momento)}`}
                    title="Emitir remito"
                  >
                    <Receipt />
                  </Button>
                </li>
              ))}
              {datos.ventas.length > A_LA_VISTA && (
                <li>
                  <button
                    type="button"
                    onClick={() => setTodas((v) => !v)}
                    className="text-muted-foreground hover:text-ink hover:bg-sunk focus-visible:ring-ring/50 w-full px-3.5 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
                  >
                    {todas
                      ? `Mostrar sólo las últimas ${A_LA_VISTA}`
                      : `Mostrar las ${num(datos.ventas.length - A_LA_VISTA)} restantes`}
                  </button>
                </li>
              )}
            </ul>
          )}
          </div>
          <div className="mt-6">
            <DocumentosDelCliente clienteId={id} />
          </div>
        </section>
        <aside className="order-1 grid min-w-0 content-start gap-4 lg:order-2">
          <FichaContacto
            contacto={datos.contacto}
            telefono={datos.telefono}
            mail={datos.mail}
            cuit={datos.cuit}
            direccion={datos.direccion}
            notas={datos.notas}
            generico={datos.generico}
            onEditar={() => setEditando(true)}
          />
          {/* Blanco / negro. Es un dato sensible: la sospecha de la spec es
              que el operador de planta no tiene que verlo. Los permisos se
              definen con José, así que por ahora se muestra sin gatear. */}
          <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
            <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
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
