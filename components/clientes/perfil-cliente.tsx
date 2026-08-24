'use client';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  FlaskConical,
  Pencil,
  Receipt,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { Cifra } from '@/components/dominio/cifra';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { Estado, MarcaFiscalDeVenta } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { DocumentosDelCliente } from '@/components/clientes/documentos-del-cliente';
import { FichaContacto } from '@/components/clientes/ficha-contacto';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
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
      {/* Tres columnas de a cuatro: quién es · cuánto pesa · cómo viene.
          El historial ya no comparte fila con nada — se fue abajo, a
          todo el ancho, que es donde una tabla de siete columnas se lee. */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
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

        <div className="flex flex-col gap-4">
          <Bloque rotulo="Volumen total comprado">
            <Cifra valor={dec(resumen.m3)} unidad="m³" tamano="xl" />
          </Bloque>
          <Bloque rotulo="Cantidad de ventas">
            <Cifra valor={num(resumen.ventas)} tamano="xl" />
          </Bloque>
          {/* Hundido y más chico: es la consecuencia de los dos de arriba,
              no un tercer dato independiente. */}
          <Bloque rotulo="Total facturado" hundido>
            <Cifra valor={$(resumen.facturado)} tamano="lg" />
            <p className="text-faint mt-1 text-xs">Suma de las cargas que tiene asignadas</p>
          </Bloque>
        </div>

        <div className="flex flex-col gap-4">
          {/* Blanco / negro. Es un dato sensible: la sospecha de la spec es
              que el operador de planta no tiene que verlo. Los permisos se
              definen con José, así que por ahora se muestra sin gatear. */}
          <Bloque rotulo="Distribución fiscal">
            {blanco === null ? (
              <p className="text-faint text-sm">
                Ninguna de sus ventas tiene el corte definido todavía.
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">Blanco</span>
                  <span className="num text-sm">{blanco}%</span>
                </div>
                <ProporcionFiscal blanco={resumen.blanco} negro={resumen.negro} />
                <dl className="divide-line mt-4 grid divide-y text-sm">
                  <ParteFiscal color="bg-paper border-line-strong" rotulo="En blanco" valor={resumen.blanco} />
                  <ParteFiscal color="bg-ink border-ink" rotulo="En negro" valor={resumen.negro} />
                </dl>
                <p className="text-faint mt-3 text-xs">
                  Sobre {definidas} {definidas === 1 ? 'venta' : 'ventas'} con el corte
                  definido.
                </p>
              </>
            )}
          </Bloque>

          <Bloque rotulo="Última compra">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="text-faint size-4 shrink-0" aria-hidden />
              {resumen.ultimaCompra ? (
                <>
                  {textoDeDias(diasSinComprar(resumen.ultimaCompra))}
                  <span className="text-faint font-normal">
                    · {fechaLargaDeMomento(resumen.ultimaCompra)}
                  </span>
                </>
              ) : (
                <span className="text-faint font-normal">Sin cargas asignadas</span>
              )}
            </p>
            <div className="border-line mt-4 border-t pt-4">
              <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
                Receta principal
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                <FlaskConical className="text-faint size-4 shrink-0" aria-hidden />
                {resumen.recetaFrecuente ? (
                  <>
                    Sobre todo <span className="font-mono">{resumen.recetaFrecuente}</span>
                  </>
                ) : (
                  <span className="text-faint font-normal">Todavía no compró</span>
                )}
              </p>
            </div>
          </Bloque>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Historial de cargas
            </h2>
            <p className="text-faint mt-1 text-sm">
              {datos.ventas.length === 0
                ? 'Todavía no tiene entregas registradas.'
                : todas
                  ? `Las ${num(datos.ventas.length)} entregas registradas para este cliente.`
                  : `Las últimas ${A_LA_VISTA} de ${num(datos.ventas.length)} entregas registradas para este cliente.`}
            </p>
          </div>
          {datos.ventas.length > A_LA_VISTA && (
            <Button variant="ghost" size="sm" onClick={() => setTodas((v) => !v)}>
              {todas ? `Ver sólo las últimas ${A_LA_VISTA}` : 'Ver todas las cargas'}
              {todas ? null : <ArrowRight data-icon="inline-end" />}
            </Button>
          )}
        </div>

        {datos.ventas.length === 0 ? (
          <EstadoVacio
            className="mt-4"
            titulo="Todavía no tiene cargas asignadas"
            descripcion="Cuando exista el apartado de Cargas, las que se le asignen van a aparecer acá y los números de arriba se van a mover solos."
          />
        ) : (
          <>
          {/* Escritorio: la tabla, que deja comparar una columna de un
              vistazo. En el teléfono no entra, y la versión que "entra"
              con scroll lateral no la usa nadie. */}
          <div className="border-line bg-card shadow-tarjeta mt-4 hidden overflow-hidden rounded-lg border sm:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sunk">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-32">Fecha · hora</TableHead>
                    <TableHead className="w-24">Carga</TableHead>
                    <TableHead className="w-20">Receta</TableHead>
                    <TableHead className="w-24 text-right">Volumen</TableHead>
                    <TableHead className="w-36 text-right">Monto</TableHead>
                    <TableHead className="w-24 text-center">Tipo</TableHead>
                    <TableHead className="w-20 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(todas ? datos.ventas : datos.ventas.slice(0, A_LA_VISTA)).map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="num text-muted-foreground text-sm">
                        {fechaDeMomento(v.momento)}
                        <span className="text-faint ml-2">{hora(v.momento)}</span>
                      </TableCell>
                      <TableCell className="num text-sm font-medium">{v.id}</TableCell>
                      <TableCell className="num text-faint text-sm">{v.receta}</TableCell>
                      <TableCell className="text-right">
                        <Cifra valor={v.m3} unidad="m³" tamano="sm" />
                      </TableCell>
                      <TableCell className="num text-right text-sm font-medium">
                        {v.total ? $(v.total) : <span className="text-faint">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <MarcaFiscalDeVenta venta={v} />
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Un remito por carga. Sale de acá y no de una
                            pantalla aparte porque es donde José mira
                            cuando el cliente llama pidiendo el papel de
                            una entrega puntual. */}
                        <Button
                          nativeButton={false}
                          variant="ghost"
                          size="icon-sm"
                          render={
                            <Link
                              href={`/clientes/${id}/emitir?tipo=remito&carga=${v.id}` as Route}
                            />
                          }
                          aria-label={`Emitir remito de la carga ${v.id}`}
                          title="Emitir remito"
                        >
                          <Receipt />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Teléfono: una línea por entrega. El corte fiscal de cada
              venta sale acá: ya está resumido arriba, en Distribución
              fiscal, y en 390 px lo que tiene que entrar es el monto y
              el botón del remito. */}
          <ul className="border-line bg-card shadow-tarjeta divide-line mt-4 divide-y overflow-hidden rounded-lg border sm:hidden">
            {(todas ? datos.ventas : datos.ventas.slice(0, A_LA_VISTA)).map((v) => (
              <li key={v.id} className="flex items-center gap-2.5 py-2 pr-1 pl-3.5">
                <span className="num text-muted-foreground w-11 shrink-0 text-sm">
                  {fechaDeMomento(v.momento)}
                </span>
                <span className="num text-faint w-12 shrink-0 text-xs">{v.receta}</span>
                <Cifra valor={v.m3} unidad="m³" tamano="sm" />
                <span className="num ml-auto text-sm font-medium whitespace-nowrap">
                  {v.total ? $(v.total) : <span className="text-faint">—</span>}
                </span>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="icon-sm"
                  render={
                    <Link href={`/clientes/${id}/emitir?tipo=remito&carga=${v.id}` as Route} />
                  }
                  aria-label={`Emitir remito de la carga ${v.id}`}
                  title="Emitir remito"
                >
                  <Receipt />
                </Button>
              </li>
            ))}
          </ul>
          </>
        )}

        <div className="mt-6">
          <DocumentosDelCliente clienteId={id} />
        </div>
      </section>

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
/** El ladrillo del bento: un rótulo arriba y lo que sea abajo. */
function Bloque({
  rotulo,
  hundido = false,
  children,
}: {
  rotulo: string;
  /** Superficie hundida: lo que se deriva de otra cosa, no un dato propio. */
  hundido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-line flex flex-1 flex-col rounded-lg border p-4',
        hundido ? 'bg-sunk' : 'bg-card shadow-tarjeta',
      )}
    >
      <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        {rotulo}
      </h3>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

/** Una de las dos mitades del corte fiscal, con su muestra de color. */
function ParteFiscal({
  color,
  rotulo,
  valor,
}: {
  color: string;
  rotulo: string;
  valor: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground flex items-center gap-2">
        <span
          className={cn('border-line inline-block size-2.5 rounded-full border', color)}
          aria-hidden
        />
        {rotulo}
      </dt>
      <dd className="num">{$(valor)}</dd>
    </div>
  );
}

/** La barra son pesos, no cantidad de ventas. Ver ResumenCliente. */
function ProporcionFiscal({ blanco, negro }: { blanco: number; negro: number }) {
  const total = blanco + negro;
  if (!total) return null;
  return (
    <div
      className="border-line mt-2 flex h-2 overflow-hidden rounded-full border"
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
