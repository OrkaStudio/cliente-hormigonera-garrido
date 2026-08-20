import { Suspense } from 'react';
import { ActualizacionEnVivo } from '@/components/app/actualizacion-en-vivo';
import { AlertaResoluble } from '@/components/app/alerta-resoluble';
import { BarraSuperior } from '@/components/app/barra-superior';
import { FiltroRango } from '@/components/app/filtro-rango';
import { Alerta } from '@/components/dominio/alerta';
import { BarraDesvio } from '@/components/dominio/barra-desvio';
import { Estado, MarcaFiscal } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { SemaforoStock } from '@/components/dominio/semaforo-stock';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { traerInicio, type Rango } from '@/lib/datos/inicio';
import { $, dec, hora } from '@/lib/formato';

/** 19/8 — solo el día y el mes, para las filas de rangos largos. */
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
import { cn } from '@/lib/utils';

/**
 * Apartado 1 — Inicio.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-1-inicio.md
 *
 * Una sola regla la gobierna: si no es de hoy o no requiere acción, no va acá.
 *
 * ⚠️ La spec dice móvil primero (R5). Se está construyendo **escritorio
 * primero** por decisión de Lau (20/08): primero toda la web en escritorio,
 * después la pasada de móvil.
 */

export const dynamic = 'force-dynamic';

const RANGOS_VALIDOS: Rango[] = ['hoy', 'semana', 'mes'];

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: crudo } = await searchParams;
  const rango = RANGOS_VALIDOS.includes(crudo as Rango) ? (crudo as Rango) : 'hoy';

  const d = await traerInicio(rango);
  const sinDatos = d.alertas.find((a) => a.id === 'sin-datos');
  const resto = d.alertas.filter((a) => a.id !== 'sin-datos');

  const fecha = d.ahora.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <BarraSuperior />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        {/* Encabezado. El estado de la planta vive acá y no adentro de un KPI:
            es salud del sistema, no un número del negocio — y sacarlo de la
            tarjeta deja las tres del mismo alto. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Resumen {d.rango === 'hoy' ? 'del día' : d.etiquetaRango}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm first-letter:uppercase">
              {fecha}
              {d.planta.ultimaCarga && ` · última carga a las ${hora(d.planta.ultimaCarga)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Estado tono={d.planta.enLinea ? 'ok' : 'danger'} punto>
              {d.planta.enLinea ? 'Planta en línea' : 'Planta sin datos'}
            </Estado>
            <ActualizacionEnVivo />
            <Suspense fallback={null}>
              <FiltroRango />
            </Suspense>
          </div>
        </div>

        {/* R4 — El silencio también es información. */}
        {sinDatos && (
          <div className="mt-6">
            <Alerta
              titulo={sinDatos.titulo}
              tono={sinDatos.tono}
              accion={
                <Button variant="outline" size="sm" disabled title="Sin diagnóstico todavía">
                  {sinDatos.accion}
                </Button>
              }
            >
              {sinDatos.detalle}
            </Alerta>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <TarjetaKpi
            rotulo="Cargas"
            valor={d.hoy.cargas}
            pie={d.hoy.sinAsignar > 0 ? `${d.hoy.sinAsignar} sin cliente` : 'todas asignadas'}
            tono={d.hoy.sinAsignar > 0 ? 'warn' : 'neutro'}
          />
          <TarjetaKpi
            rotulo="Producción"
            valor={dec(d.hoy.m3)}
            unidad="m³"
            pie="hormigón elaborado"
          />
          <TarjetaKpi
            rotulo="Facturado"
            valor={$(d.hoy.facturado)}
            pie="de las cargas asignadas"
          />
        </section>

        <section className="mt-9">
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Requiere acción
          </h2>

          {resto.length === 0 ? (
            <div className="mt-3">
              <EstadoVacio
                titulo="No hay nada para atender"
                descripcion="La planta viene produciendo, las cargas tienen cliente y ningún material está por quebrar."
              />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {resto.map((a) => (
                <AlertaResoluble key={a.id} alerta={a} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-9 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Cargas {d.etiquetaRango}
            </h2>

            {d.ultimas.length === 0 ? (
              <div className="mt-3">
                <EstadoVacio
                  titulo="Todavía no se produjo"
                  descripcion="Cuando el PLC cierre el primer ciclo, la carga aparece acá sola."
                />
              </div>
            ) : (
              <div className="border-line bg-panel mt-3 overflow-x-auto rounded-xl border">
                {/* Cinco columnas, no siete. Los kilos crudos de cemento
                    (2.327) no le dicen nada a nadie: lo que importa de esa
                    pesada es si se fue de rango, y eso lo cuenta la barra. */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">
                        {d.rango === 'hoy' ? 'Hora' : 'Cuándo'}
                      </TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="w-14 text-right">m³</TableHead>
                      <TableHead className="w-32">Desvío</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      <TableHead className="w-24">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.ultimas.map((c) => {
                      const cem = c.pesadas.find((p) => p.material === 'Cemento');
                      const accionable = !c.cliente;
                      return (
                        <TableRow
                          key={c.id}
                          className={cn(accionable && 'bg-warn-wash')}
                        >
                          {/* Con rango de varios días, la hora sola hace que
                              las filas parezcan desordenadas: 16:40 arriba de
                              19:25 es correcto si son días distintos, pero no
                              se entiende sin la fecha. */}
                          <TableCell className="text-muted-foreground font-mono whitespace-nowrap tabular-nums">
                            {d.rango !== 'hoy' && (
                              <span className="text-faint mr-1.5">{fechaCorta(c.momento)}</span>
                            )}
                            {hora(c.momento)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.cliente ?? <span className="text-warn-text">Sin asignar</span>}
                            <span className="text-faint ml-1.5 font-mono text-xs">{c.receta}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.m3}</TableCell>
                          <TableCell>
                            {cem && (
                              <span
                                title={`Cemento: pidió ${cem.objetivo.toLocaleString('es-AR')} kg, pesó ${cem.real.toLocaleString('es-AR')} kg`}
                              >
                                <BarraDesvio objetivo={cem.objetivo} real={cem.real} />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.total ? $(c.total) : <span className="text-faint">—</span>}
                          </TableCell>
                          <TableCell>
                            {c.fiscal ? (
                              <MarcaFiscal tipo={c.fiscal} />
                            ) : (
                              <Estado tono="warn">Sin cliente</Estado>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>
                        Total {d.etiquetaRango}
                        <span className="text-faint ml-1.5 font-normal">
                          · {d.hoy.cargas} cargas
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.hoy.m3}</TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">
                        {$(d.hoy.facturado)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}

            {/* El pie de la tabla totaliza el rango entero, no las filas que
                se ven. Sin esta línea, el total parece no cerrar. */}
            {d.totalCargas > d.ultimas.length && (
              <p className="text-faint mt-2 text-xs">
                Se muestran las {d.ultimas.length} más recientes de {d.totalCargas}. El
                total de abajo es del rango completo.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Materiales
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {d.materiales.map((m) => (
                <SemaforoStock
                  key={m.nombre}
                  material={m.nombre}
                  restante={m.restante}
                  capacidad={m.capacidad}
                  unidad={m.unidad}
                  diasRestantes={Math.floor(m.restante / m.consumoDiario)}
                />
              ))}
            </div>
          </section>
        </div>

        <p className="text-faint mt-10 text-xs">
          {d.planta.enLinea
            ? 'La planta viene mandando datos.'
            : `Sin datos de la planta hace ${Math.floor(d.planta.horasSinDatos)} horas.`}{' '}
          Los materiales son estimados: los silos no tienen balanza.
        </p>
      </main>
    </>
  );
}
