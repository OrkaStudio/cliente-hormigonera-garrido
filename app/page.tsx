import { Alerta } from '@/components/dominio/alerta';
import { BarraDesvio } from '@/components/dominio/barra-desvio';
import { Cifra } from '@/components/dominio/cifra';
import { Estado, MarcaFiscal } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { SemaforoStock } from '@/components/dominio/semaforo-stock';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { BarraSuperior } from '@/components/app/barra-superior';
import { Button } from '@/components/ui/button';
import { traerInicio } from '@/lib/datos/inicio';
import { $, dec, hora } from '@/lib/formato';

/**
 * Apartado 1 — Inicio.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-1-inicio.md
 *
 * Una sola regla la gobierna: si no es de hoy o no requiere acción, no va
 * acá. Y se abre en el celular — José la mira desde el auto, no desde un
 * escritorio.
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

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Resumen del día
        </h1>
        <p className="text-muted-foreground mt-1 text-sm first-letter:uppercase">
          {fecha}
          {d.planta.ultimaCarga && ` · última carga a las ${hora(d.planta.ultimaCarga)}`}
        </p>

        {/* R4 — El silencio también es información. Si la planta no manda
            datos, eso va antes que cualquier número: los de abajo están
            incompletos y hay que decirlo. */}
        {sinDatos && (
          <div className="mt-5">
            <Alerta
              titulo={sinDatos.titulo}
              tono={sinDatos.tono}
              accion={<Button variant="outline" size="sm">{sinDatos.accion}</Button>}
            >
              {sinDatos.detalle}
            </Alerta>
          </div>
        )}

        {/* Cómo viene el día. Tres números y nada más. */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
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
          <TarjetaKpi
            rotulo="Facturado"
            valor={$(d.hoy.facturado)}
            pie="de las cargas asignadas"
            className="col-span-2 lg:col-span-1"
          />
        </section>

        {/* Qué requiere que haga algo. */}
        <section className="mt-8">
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
                <Alerta
                  key={a.id}
                  titulo={a.titulo}
                  tono={a.tono}
                  accion={
                    <Button variant="outline" size="sm" disabled title="El apartado todavía no está construido">
                      {a.accion}
                    </Button>
                  }
                >
                  {a.detalle}
                </Alerta>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Las últimas cargas. En el celular no es una tabla: es una lista. */}
          <section>
            <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Últimas cargas
            </h2>

            {d.ultimas.length === 0 ? (
              <div className="mt-3">
                <EstadoVacio
                  titulo="Todavía no se produjo hoy"
                  descripcion="Cuando el PLC cierre el primer ciclo, la carga aparece acá sola."
                />
              </div>
            ) : (
              <ul className="border-line bg-panel mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border">
                {d.ultimas.map((c) => {
                  const cemento = c.pesadas.find((p) => p.material === 'Cemento');
                  return (
                    <li
                      key={c.id}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 p-3.5 sm:grid-cols-[auto_1fr_auto_6rem_auto_auto]"
                    >
                      <span className="text-muted-foreground font-mono text-sm tabular-nums">
                        {hora(c.momento)}
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium">
                        {c.cliente ?? <span className="text-warn-text">Sin asignar</span>}
                        <span className="text-faint ml-1.5 hidden font-mono text-xs sm:inline">{c.receta}</span>
                      </span>
                      <Cifra valor={c.m3} unidad="m³" tamano="sm" />
                      {cemento ? (
                        <span className="hidden sm:block" title="Desvío del cemento">
                          <BarraDesvio objetivo={cemento.objetivo} real={cemento.real} />
                        </span>
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <span className="col-start-2 text-sm tabular-nums sm:col-start-auto sm:text-right">
                        {c.total ? $(c.total) : <span className="text-faint">—</span>}
                      </span>
                      <span className="justify-self-end">
                        {c.fiscal && <MarcaFiscal tipo={c.fiscal} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Stock: no es "de hoy", pero sí requiere acción — por eso entra. */}
          <section>
            <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Materiales
            </h2>
            <div className="mt-3 space-y-3">
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
