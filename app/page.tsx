import { ActualizacionEnVivo } from '@/components/app/actualizacion-en-vivo';
import { AlertaResoluble } from '@/components/app/alerta-resoluble';
import { BarraSuperior } from '@/components/app/barra-superior';
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
import { traerInicio } from '@/lib/datos/inicio';
import { $, dec, hora } from '@/lib/formato';

/**
 * Apartado 1 — Inicio.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-1-inicio.md
 *
 * Una sola regla la gobierna: si no es de hoy o no requiere acción, no va acá.
 *
 * ⚠️ La spec dice móvil primero (R5) y su criterio de terminado pide que se
 * entienda sin scrollear en el celular. Se está construyendo **escritorio
 * primero** por decisión de Lau (20/08): primero toda la web en escritorio,
 * después la pasada de móvil. La spec queda desalineada a propósito.
 */

// Los datos se derivan del momento de la consulta: sin esto, el build
// congela "hoy" en la fecha del deploy.
export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const d = await traerInicio();
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
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Resumen del día
            </h1>
            <p className="text-muted-foreground mt-1 text-sm first-letter:uppercase">
              {fecha}
              {d.planta.ultimaCarga && ` · última carga a las ${hora(d.planta.ultimaCarga)}`}
            </p>
          </div>
          <ActualizacionEnVivo />
        </div>

        {/* R4 — El silencio también es información. Si la planta no manda
            datos, eso va antes que cualquier número: los de abajo están
            incompletos y hay que decirlo. */}
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

        {/* Cómo viene el día. Tres números y nada más. */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <TarjetaKpi
            rotulo="Cargas del día"
            valor={d.hoy.cargas}
            pie={d.hoy.sinAsignar > 0 ? `${d.hoy.sinAsignar} sin cliente` : 'todas asignadas'}
            tono={d.hoy.sinAsignar > 0 ? 'warn' : 'neutro'}
            extra={
              <Estado tono={d.planta.enLinea ? 'ok' : 'danger'} punto>
                {d.planta.enLinea ? 'Planta en línea' : 'Planta sin datos'}
              </Estado>
            }
          />
          <TarjetaKpi rotulo="Producción" valor={dec(d.hoy.m3)} unidad="m³" pie="hormigón elaborado" />
          <TarjetaKpi rotulo="Facturado" valor={$(d.hoy.facturado)} pie="de las cargas asignadas" />
        </section>

        {/* Qué requiere que haga algo. Cada alerta se resuelve acá mismo. */}
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
          <section>
            <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Cargas de hoy
            </h2>

            {d.ultimas.length === 0 ? (
              <div className="mt-3">
                <EstadoVacio
                  titulo="Todavía no se produjo hoy"
                  descripcion="Cuando el PLC cierre el primer ciclo, la carga aparece acá sola."
                />
              </div>
            ) : (
              <div className="border-line bg-panel mt-3 overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">m³</TableHead>
                      <TableHead className="text-right">Cemento</TableHead>
                      <TableHead>Desvío</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.ultimas.map((c) => {
                      const cem = c.pesadas.find((p) => p.material === 'Cemento');
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-muted-foreground font-mono tabular-nums">
                            {hora(c.momento)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.cliente ?? <span className="text-warn-text">Sin asignar</span>}
                            <span className="text-faint ml-1.5 font-mono text-xs">{c.receta}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.m3}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {cem ? cem.real.toLocaleString('es-AR') : '—'}
                          </TableCell>
                          <TableCell className="w-28">
                            {cem && <BarraDesvio objetivo={cem.objetivo} real={cem.real} />}
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
                      <TableCell colSpan={2}>Total del día</TableCell>
                      <TableCell className="text-right tabular-nums">{d.hoy.m3}</TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right tabular-nums">{$(d.hoy.facturado)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </section>

          {/* Stock: no es "de hoy", pero sí requiere acción — por eso entra. */}
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
