'use client';

import { Suspense } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { FiltroRango } from '@/components/app/filtro-rango';
import { BarrasMes } from '@/components/graficos/barras-mes';
import { LineaMargen } from '@/components/graficos/linea-margen';
import { CostosFijos } from '@/components/rentabilidad/costos-fijos';
import type { DatosRentabilidad } from '@/lib/datos/rentabilidad';
import { $, dec, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** El $ sin centavos y corto, para ejes y series. */
const $$ = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
    : $(n);

function Variacion({ valor, sufijo = '%' }: { valor: number | null; sufijo?: string }) {
  if (valor === null) {
    return <span className="text-faint text-xs">sin período anterior</span>;
  }
  const sube = valor > 0.05;
  const baja = valor < -0.05;
  const Icono = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        sube ? 'text-ok-text' : baja ? 'text-danger-text' : 'text-faint',
      )}
    >
      <Icono className="size-3" aria-hidden />
      {valor > 0 ? '+' : ''}
      {valor.toFixed(1).replace('.', ',')}
      {sufijo}
    </span>
  );
}

export function PanelRentabilidad({ datos: d }: { datos: DatosRentabilidad }) {
  const etiquetaPeriodo = d.rango === 'mes' ? 'del mes' : 'del trimestre';
  const etiquetaPrevio = d.rango === 'mes' ? 'el mes pasado' : 'el trimestre pasado';

  const seriesMes = d.meses.map((m) => ({
    etiqueta: m.etiqueta,
    valor: m.resumen.facturado,
    detalle: $(m.resumen.facturado),
    parcial: m.enCurso,
  }));

  const seriePrecio = d.meses.map((m) => ({
    etiqueta: m.etiqueta,
    precio: Math.round(m.resumen.precioPorM3),
    costo: Math.round(m.resumen.costoPorM3),
  }));

  return (
    <>
      <BarraSuperior activo="Rentabilidad" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              Rentabilidad
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Margen de materiales sobre las cargas asignadas, contra {etiquetaPrevio}
              {d.enCurso && (
                <>
                  {' '}
                  <span className="text-faint">
                    hasta el día {d.diaDelMes}, para que la comparación sea pareja
                  </span>
                </>
              )}
              .
            </p>
          </div>
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
            resto de los números. */}
        <p className="border-line bg-sunk text-muted-foreground mt-4 flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="text-ink font-medium">Margen de materiales:</span> lo facturado
            menos lo que costaron cemento, arena y piedra. No incluye sueldos, combustible ni
            mixer — esos se cargan abajo, en costos fijos.
            {' '}Los costos de material son <span className="text-ink">valores sembrados</span>{' '}
            hasta que exista el apartado de Compras.
          </span>
        </p>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            pie={`${$(Math.round(d.actual.costoPorM3))} por m³`}
          />
          <Kpi
            rotulo="Margen de materiales"
            valor={$(d.actual.margenMateriales)}
            variacion={d.variaciones.margen}
            pie={`${$(Math.round(d.actual.margenPorM3))} por m³`}
            fuerte
          />
          <Kpi
            rotulo="Margen sobre la venta"
            valor={`${d.actual.margenPct.toFixed(1).replace('.', ',')}%`}
            variacion={d.variaciones.margenPct}
            sufijo=" pts"
            pie={
              d.variaciones.margenPct === null
                ? 'sin comparación'
                : `contra ${d.previo.margenPct.toFixed(1).replace('.', ',')}% ${etiquetaPrevio}`
            }
          />
        </section>

        {/* La carrera contra la inflación. Facturar más que el mes pasado
            no significa nada si el costo subió más: el margen se achica
            igual, y ese es el error más caro de una planta. */}
        {d.carrera && (
          <section
            className={cn(
              'mt-4 rounded-xl border p-4',
              d.carrera.gana ? 'border-ok/30 bg-ok-soft' : 'border-warn/40 bg-warn-soft',
            )}
          >
            <p className={cn('font-medium', d.carrera.gana ? 'text-ok-text' : 'text-warn-text')}>
              {d.carrera.gana
                ? 'El precio le está ganando al costo'
                : 'El costo sube más rápido que el precio'}
            </p>
            <p className="text-ink-soft mt-1 text-sm">
              Contra {etiquetaPrevio}, el precio por m³ se movió{' '}
              <span className="font-mono tabular-nums">
                {d.carrera.precio > 0 ? '+' : ''}
                {d.carrera.precio.toFixed(1).replace('.', ',')}%
              </span>{' '}
              y el costo{' '}
              <span className="font-mono tabular-nums">
                {d.carrera.costo > 0 ? '+' : ''}
                {d.carrera.costo.toFixed(1).replace('.', ',')}%
              </span>
              .{' '}
              {d.carrera.gana
                ? 'Mientras se mantenga así, el margen no se achica.'
                : 'Si sigue así, cada m³ deja menos aunque se facture más.'}
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
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
              Precio y costo por m³
            </h2>
            <p className="text-faint mt-1 text-xs">
              El área verde es el margen. Si se angosta, la inflación se lo está comiendo.
            </p>
            <div className="mt-3">
              <LineaMargen datos={seriePrecio} formato={$$} />
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Qué conviene producir
            </h2>
            <p className="text-faint mt-1 text-xs">
              Ordenado por lo que deja cada m³, no por cuánto se vendió.
            </p>
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
                      <div className="bg-s3 h-full rounded-full" style={{ width: `${ancho}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
            <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Dónde se va la plata
            </h2>
            <p className="text-faint mt-1 text-xs">
              El cemento suele ser el grueso del costo: ahí es donde un desvío chico pesa.
            </p>
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

        <section className="border-line bg-panel shadow-tarjeta mt-6 rounded-xl border p-4">
          <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Qué cliente conviene atender
          </h2>
          <p className="text-faint mt-1 text-xs">
            Ordenado por lo que deja, no por cuánto compra. No siempre es el mismo.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line text-faint border-b text-left text-xs">
                  <th className="py-1.5 font-medium">Cliente</th>
                  <th className="py-1.5 text-right font-medium">m³</th>
                  <th className="py-1.5 text-right font-medium">Facturado</th>
                  <th className="py-1.5 text-right font-medium">Margen</th>
                  <th className="py-1.5 text-right font-medium">Por m³</th>
                </tr>
              </thead>
              <tbody>
                {d.porCliente.map((c) => (
                  <tr key={c.id} className="border-line border-b last:border-0">
                    <td className="py-2 font-medium">{c.nombre}</td>
                    <td className="py-2 text-right tabular-nums">{dec(c.m3)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{$(c.facturado)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {c.margenPct.toFixed(1).replace('.', ',')}%
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {$(Math.round(c.margenPorM3))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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

function Kpi({
  rotulo,
  valor,
  variacion,
  pie,
  sufijo,
  fuerte = false,
}: {
  rotulo: string;
  valor: string;
  variacion: number | null;
  pie: string;
  sufijo?: string;
  fuerte?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-line bg-card shadow-tarjeta rounded-lg border p-4',
        fuerte && 'border-ink/15 ring-ink/5 ring-1',
      )}
    >
      <p className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        {rotulo}
      </p>
      <p
        className={cn(
          'mt-1.5 font-mono font-semibold tabular-nums',
          fuerte ? 'text-2xl' : 'text-xl',
        )}
      >
        {valor}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <Variacion valor={variacion} sufijo={sufijo} />
        <span className="text-faint text-xs">{pie}</span>
      </div>
    </div>
  );
}
