'use client';

import { Suspense } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { FiltroRango } from '@/components/app/filtro-rango';
import { BarrasMes } from '@/components/graficos/barras-mes';
import { CostosFijos } from '@/components/rentabilidad/costos-fijos';
import type { DatosRentabilidad } from '@/lib/datos/rentabilidad';
import { $, dec, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** El $ sin centavos y corto, para ejes y series. */
const $$ = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
    : $(n);

/** Un porcentaje con signo, en castellano. */
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}`;

function Variacion({
  valor,
  sufijo = '%',
  invertido = false,
}: {
  valor: number | null;
  sufijo?: string;
  /** Para un costo, subir es mala noticia: el color no sigue a la flecha. */
  invertido?: boolean;
}) {
  if (valor === null) {
    return <span className="text-faint text-xs">sin período anterior</span>;
  }
  const sube = valor > 0.05;
  const baja = valor < -0.05;
  const Icono = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus;
  const bueno = invertido ? baja : sube;
  const malo = invertido ? sube : baja;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        bueno ? 'text-ok-text' : malo ? 'text-danger-text' : 'text-faint',
      )}
    >
      <Icono className="size-3" aria-hidden />
      {pct(valor)}
      {sufijo}
    </span>
  );
}

export function PanelRentabilidad({ datos: d }: { datos: DatosRentabilidad }) {
  const etiquetaPeriodo = d.rango === 'mes' ? 'del mes' : 'del trimestre';
  const etiquetaPrevio = d.rango === 'mes' ? 'el mes pasado' : 'el trimestre pasado';

  /** Contra qué se compara. Dicho una vez, y pegado al número que compara. */
  const base = d.enCurso
    ? `contra ${etiquetaPrevio} hasta el día ${d.diaDelMes}`
    : `contra ${etiquetaPrevio}`;

  const seriesMes = d.meses.map((m) => ({
    etiqueta: m.etiqueta,
    valor: m.resumen.facturado,
    detalle: $(m.resumen.facturado),
    parcial: m.enCurso,
  }));

  const serieGasoil = d.meses.map((m) => ({
    etiqueta: m.etiqueta,
    valor: Math.round(m.combustible),
    detalle: `${$(Math.round(m.combustible))} · ${Math.round(m.km).toLocaleString('es-AR')} km`,
    parcial: m.enCurso,
  }));

  return (
    <>
      <BarraSuperior activo="Rentabilidad" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            Rentabilidad
          </h1>
          <Suspense fallback={null}>
            <FiltroRango
              opciones={[
                { valor: 'mes', etiqueta: 'Este mes' },
                { valor: 'trimestre', etiqueta: 'Trimestre' },
              ]}
              porDefecto="mes"
            />
          </Suspense>
        </div>

        {/* R1 — se llama margen DE MATERIALES, con todas las letras. No es
            una limitación escondida: es lo único que se puede calcular con
            precisión, y decirlo es lo que sostiene la confianza en el
            resto de los números.

            Es la única bajada del título. Antes había dos, y la de arriba
            explicaba lo mismo noventa píxeles más arriba: contra qué se
            compara ahora vive pegado al número que compara. */}
        <p className="border-line bg-sunk text-muted-foreground mt-3 flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="text-ink font-medium">Margen de materiales:</span> lo facturado
            menos cemento, áridos, agua y aditivo. Sueldos y mixer se cargan abajo. Costos de
            material <span className="text-ink">sembrados</span> hasta que exista Compras.
          </span>
        </p>

        {/* El número que manda. Uno solo, en dos unidades: la plata que
            quedó y qué proporción de la venta es. Todo lo que viene
            después existe para explicar este par. */}
        <section className="border-line bg-panel shadow-tarjeta mt-4 rounded-xl border p-4 sm:p-6">
          <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Margen de materiales {etiquetaPeriodo}
          </h2>

          <div className="mt-3 grid gap-y-4 sm:inline-grid sm:grid-cols-[auto_auto] sm:items-end sm:gap-x-10">
            <div>
              <p className="font-mono text-[2.25rem] leading-none font-semibold tabular-nums sm:text-5xl">
                {$(d.actual.margenMateriales)}
              </p>
              <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <Variacion valor={d.variaciones.margen} />
                <span className="text-faint text-xs">{base}</span>
                <span className="text-faint text-xs">·</span>
                <span className="font-mono tabular-nums">
                  {$(Math.round(d.actual.margenPorM3))}
                </span>
                <span className="text-faint text-xs">por m³</span>
              </p>
            </div>

            <div className="border-line border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-10">
              <p className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                {d.actual.margenPct.toFixed(1).replace('.', ',')}%
              </p>
              <p className="text-faint mt-1 text-xs">
                sobre la venta
                {d.variaciones.margenPct !== null && (
                  <>
                    {' · '}
                    <span className="font-mono tabular-nums">
                      {pct(d.variaciones.margenPct)} pts
                    </span>{' '}
                    contra {d.previo.margenPct.toFixed(1).replace('.', ',')}%
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* La carrera contra la inflación: el hallazgo del producto.
            Facturar más que el mes pasado no significa nada si el costo
            subió más — el margen se achica igual.

            Va invertida y a todo el ancho porque tiene que pesar más que
            una tarjeta, y antes pesaba lo mismo. El negro le da ese peso
            sin gastar el rojo, que adentro de los datos significaría otra
            cosa: los dos porcentajes van neutros y quién le gana a quién
            lo dice el título. */}
        {d.carrera && (
          <section className="bg-ink text-primary-foreground mt-4 flex items-start gap-4 rounded-xl p-5 sm:gap-5 sm:p-6">
            {d.carrera.gana ? (
              <TrendingUp className="text-ok mt-0.5 size-6 shrink-0" aria-hidden />
            ) : (
              <TrendingDown className="text-danger mt-0.5 size-6 shrink-0" aria-hidden />
            )}
            <div>
              <p className="font-heading text-lg font-semibold sm:text-xl">
                {d.carrera.gana
                  ? 'El precio le está ganando al costo'
                  : 'El costo sube más rápido que el precio'}
              </p>
              <p className="text-primary-foreground/70 mt-1.5 text-sm">
                Contra {etiquetaPrevio}, el precio por m³ se movió{' '}
                <span className="bg-paper/10 rounded px-1.5 py-0.5 font-mono tabular-nums">
                  {pct(d.carrera.precio)}%
                </span>{' '}
                y el costo{' '}
                <span className="bg-paper/10 rounded px-1.5 py-0.5 font-mono tabular-nums">
                  {pct(d.carrera.costo)}%
                </span>
                .{' '}
                {d.carrera.gana
                  ? 'Mientras se mantenga así, el margen no se achica.'
                  : 'Si sigue así, cada m³ deja menos aunque se facture más.'}
              </p>
            </div>
          </section>
        )}

        {/* Los tres que acompañan. Sin tarjeta a propósito: con caja
            propia volvían a pesar lo mismo que el margen, que era el
            problema de esta pantalla. */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
          <Kpi
            rotulo={`Facturado ${etiquetaPeriodo}`}
            valor={$(d.actual.facturado)}
            variacion={d.variaciones.facturado}
            pie={`${num(d.actual.cargas)} cargas · ${dec(d.actual.m3)} m³`}
          />
          <Kpi
            rotulo="Costo de materiales"
            valor={$(d.actual.costoMateriales)}
            variacion={d.variaciones.costo}
            invertido
            pie={`${$(Math.round(d.actual.costoPorM3))} por m³`}
          />
          <Kpi
            rotulo="Gasoil de los viajes"
            valor={$(Math.round(d.viaje.combustibleTotal))}
            pie={`${d.viaje.pctDelMargen.toFixed(0)}% del margen · ${Math.round(d.viaje.kmPromedio)} km promedio`}
          />
        </section>

        {/* La venta y un gasto lateral no pesan lo mismo, así que no se
            dibujan del mismo tamaño. Eran dos gráficos gemelos. */}
        <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Facturado por mes
            </h2>
            <div className="mt-4">
              <BarrasMes datos={seriesMes} formato={$$} />
            </div>
          </section>

          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Gasoil por mes
            </h2>
            <div className="mt-4">
              <BarrasMes datos={serieGasoil} formato={$$} serie="neutro" alto="chico" />
            </div>
          </section>
        </div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Margen por m³ · receta
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {d.porReceta.map((r) => {
                const ancho = Math.max(
                  (r.margenPorM3 / Math.max(...d.porReceta.map((x) => x.margenPorM3), 1)) * 100,
                  2,
                );
                return (
                  <li key={r.receta}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-mono font-medium">{r.receta}</span>
                      <span className="text-faint text-xs">
                        {dec(r.m3)} m³ · {r.margenPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <span className="font-mono tabular-nums">
                        {$(Math.round(r.margenPorM3))}
                        <span className="text-faint text-xs">/m³</span>
                      </span>
                    </div>
                    <div className="bg-sunk mt-1 h-1.5 overflow-hidden rounded-full">
                      <div className="bg-faint h-full rounded-full" style={{ width: `${ancho}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Costo por material
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {d.porMaterial.map((m, i) => (
                <li key={m.material}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-[3px]"
                        style={{ background: `var(--s${(i % 4) + 1})` }}
                        aria-hidden
                      />
                      {m.material}
                    </span>
                    <span className="font-mono tabular-nums">
                      {$(Math.round(m.costo))}
                      <span className="text-faint ml-1.5 text-xs">
                        {m.pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="bg-sunk mt-1 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.pct}%`, background: `var(--s${(i % 4) + 1})` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <TablaPorCliente filas={d.porCliente} />

        <div className="mt-6">
          <CostosFijos
            margenMateriales={d.actual.margenMateriales}
            proporcionDelMes={d.proporcionDelMes}
          />
        </div>
      </main>
    </>
  );
}

/** Cuántos clientes se ven sin desplegar. Vienen ordenados por lo que dejan. */
const CLIENTES_A_LA_VISTA = 5;

function TablaPorCliente({ filas }: { filas: DatosRentabilidad['porCliente'] }) {
  const visibles = filas.slice(0, CLIENTES_A_LA_VISTA);
  const resto = filas.slice(CLIENTES_A_LA_VISTA);

  return (
    <section className="border-line bg-panel shadow-tarjeta mt-6 rounded-xl border p-4">
      <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
        Margen por cliente
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-line text-faint border-b text-left text-xs">
              <th className="py-1.5 font-medium">Cliente</th>
              <th className="hidden py-1.5 text-right font-medium sm:table-cell">m³</th>
              <th className="py-1.5 text-right font-medium">Facturado</th>
              <th className="py-1.5 text-right font-medium">Margen</th>
              <th className="hidden py-1.5 text-right font-medium sm:table-cell">Por m³</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <FilaCliente key={c.id} c={c} />
            ))}
          </tbody>
        </table>
      </div>

      {resto.length > 0 && (
        <details className="group">
          <summary className="text-muted-foreground hover:text-ink focus-visible:ring-ring/50 cursor-pointer list-none rounded py-2 text-sm marker:content-none focus-visible:ring-2 focus-visible:outline-none">
            <span className="group-open:hidden">
              {resto.length === 1 ? 'Ver el otro cliente' : `Ver los otros ${num(resto.length)} clientes`}
            </span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {resto.map((c) => (
                  <FilaCliente key={c.id} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function FilaCliente({ c }: { c: DatosRentabilidad['porCliente'][number] }) {
  return (
    <tr className="border-line border-b last:border-0">
      <td className="py-2 pr-3 font-medium">{c.nombre}</td>
      <td className="hidden py-2 text-right tabular-nums sm:table-cell">{dec(c.m3)}</td>
      <td className="py-2 pl-3 text-right font-mono tabular-nums">{$(c.facturado)}</td>
      <td className="py-2 pl-3 text-right font-mono tabular-nums">
        {c.margenPct.toFixed(1).replace('.', ',')}%
      </td>
      <td className="hidden py-2 pl-3 text-right font-mono tabular-nums sm:table-cell">
        {$(Math.round(c.margenPorM3))}
      </td>
    </tr>
  );
}

function Kpi({
  rotulo,
  valor,
  variacion,
  pie,
  sufijo,
  invertido = false,
}: {
  rotulo: string;
  valor: string;
  /** Sin variación, no se muestra la línea: "sin período anterior" es ruido. */
  variacion?: number | null;
  pie: string;
  sufijo?: string;
  invertido?: boolean;
}) {
  return (
    // En el teléfono es una fila —rótulo a la izquierda, número a la
    // derecha— y en escritorio una columna. Cinco tarjetas apiladas eran
    // seiscientos píxeles de scroll para datos de apoyo.
    <div className="border-line grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t-2 pt-3 sm:grid-cols-1">
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">{rotulo}</p>
      <p className="col-start-2 text-right font-mono text-lg font-semibold tabular-nums sm:col-start-1 sm:mt-1.5 sm:text-left sm:text-xl">
        {valor}
      </p>
      <div className="col-span-2 flex flex-wrap items-baseline gap-x-2 sm:col-span-1 sm:mt-1">
        {variacion !== undefined && (
          <Variacion valor={variacion} sufijo={sufijo} invertido={invertido} />
        )}
        <span className="text-faint text-xs">{pie}</span>
      </div>
    </div>
  );
}
