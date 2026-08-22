'use client';

import { useEffect, useState } from 'react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AjustarStock } from '@/components/materiales/ajustar-stock';
import { Estado } from '@/components/dominio/estado';
import type { DatosMateriales } from '@/lib/datos/materiales';
import { leerAjustes, ultimoAjuste } from '@/lib/datos/ajustes-locales';
import {
  diasQueAguanta,
  mermaMedida,
  nivelDeStock,
  sugerenciaDeCompra,
  type AjusteStock,
} from '@/lib/dominio/stock';
import { UMBRALES } from '@/lib/dominio/umbrales';
import { $, dec, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Materiales — apartados 5 y 7, unificados.
 *
 * Se juntaron porque comparten el sujeto y porque uno depende del otro:
 * el stock se deduce restando consumo, y el consumo sale de lo que dice
 * la receta. Tenerlos en pantallas separadas obligaba a ir y volver para
 * responder "¿me alcanza el material para lo que más vendo?".
 *
 * Arriba lo que hay. Abajo con qué se hace.
 */
export function PanelMateriales({ datos: d }: { datos: DatosMateriales }) {
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setAjustes(leerAjustes());
    setMontado(true);
  }, []);

  return (
    <>
      <BarraSuperior activo="Materiales" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            Materiales
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Lo que hay en los silos y con qué se hace cada receta.
          </p>
        </div>

        {/* La advertencia que gobierna todo el apartado: el número no está
            medido. Sin esto, alguien lo lee como si saliera de una balanza. */}
        <p className="border-line bg-sunk text-muted-foreground mt-4 rounded-lg border border-dashed px-3 py-2 text-xs">
          Los silos <span className="text-ink">no tienen balanza</span>: la existencia se
          deduce restando lo que consumió cada carga. Se corrige mirando el silo y
          declarando lo que hay.
        </p>

        <section className="mt-6">
          <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Stock
          </h2>

          <div className="mt-3 grid gap-3">
            {d.materiales.map((m) => {
              const dias =
                m.restante === null ? null : diasQueAguanta(m.restante, m.consumoDiario);
              const nivel = m.sinStock
                ? 'sin-dato'
                : nivelDeStock(dias, UMBRALES.diasParaReponer);
              const prop =
                m.restante !== null && m.capacidad ? (m.restante / m.capacidad) * 100 : 0;
              const sug = sugerenciaDeCompra(m);
              const ultimo = montado ? ultimoAjuste(m.nombre, ajustes) : null;
              const merma = montado
                ? mermaMedida(ajustes.filter((a) => a.material === m.nombre))
                : null;

              return (
                <article
                  key={m.nombre}
                  className={cn(
                    'rounded-xl border p-4',
                    nivel === 'quiebre'
                      ? 'border-danger/30 bg-danger-soft'
                      : nivel === 'bajo'
                        ? 'border-warn/40 bg-warn-soft'
                        : 'border-line bg-panel shadow-tarjeta',
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-heading text-lg font-semibold">{m.nombre}</h3>

                    {m.sinStock ? (
                      <Estado>Sale del pozo</Estado>
                    ) : (
                      <span className="font-mono text-lg tabular-nums">
                        {num(m.restante ?? 0)}
                        <span className="text-faint ml-1 text-sm">{m.unidad}</span>
                        {m.capacidad && (
                          <span className="text-faint text-xs"> de {num(m.capacidad)}</span>
                        )}
                      </span>
                    )}
                  </div>

                  {!m.sinStock && (
                    <>
                      <div className="bg-sunk mt-2.5 h-2 overflow-hidden rounded-full">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            nivel === 'quiebre'
                              ? 'bg-danger'
                              : nivel === 'bajo'
                                ? 'bg-warn'
                                : 'bg-ok',
                          )}
                          style={{ width: `${Math.min(prop, 100)}%` }}
                        />
                      </div>

                      <p className="text-muted-foreground mt-2 text-sm">
                        {dias === null ? (
                          'Sin consumo registrado: no se puede estimar cuánto aguanta.'
                        ) : (
                          <>
                            Aguanta{' '}
                            <span className="text-ink font-medium">
                              {dias} {dias === 1 ? 'día' : 'días'}
                            </span>{' '}
                            al ritmo de {num(m.consumoDiario)} {m.unidad} por día
                            {sug && (
                              <>
                                {' · '}
                                para llenar el silo entran{' '}
                                <span className="text-ink">
                                  {num(sug.cantidad)} {sug.unidad}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </p>
                    </>
                  )}

                  <div className="border-line mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-xs">
                    {m.costo !== null && m.costo > 0 && (
                      <span className="text-muted-foreground">
                        {m.costo < 100 ? `$ ${dec(m.costo)}` : $(m.costo)}
                        <span className="text-faint">/{m.unidad}</span>
                      </span>
                    )}
                    {m.unidadCompra && m.unidadCompra !== m.unidad && (
                      <span className="text-faint">
                        se compra en {m.unidadCompra} · {num(m.factorConversion ?? 1)} {m.unidad}{' '}
                        cada una
                      </span>
                    )}
                    <span className={m.medidoPorPlc ? 'text-plc-text' : 'text-warn-text'}>
                      {m.medidoPorPlc ? 'lo pesa el PLC' : 'no lo pesa el PLC'}
                    </span>

                    {merma && (
                      <span className="text-muted-foreground">
                        merma medida{' '}
                        <span className="text-ink font-mono">
                          {merma.pct.toFixed(1).replace('.', ',')}%
                        </span>{' '}
                        <span className="text-faint">
                          sobre {merma.sobre} {merma.sobre === 1 ? 'ajuste' : 'ajustes'}
                        </span>
                      </span>
                    )}

                    {!m.sinStock && m.restante !== null && (
                      <span className="ml-auto">
                        <AjustarStock
                          material={m.nombre}
                          calculado={m.restante}
                          unidad={m.unidad}
                          ultimo={ultimo}
                          onAjuste={setAjustes}
                        />
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Recetas
          </h2>

          <div className="border-line bg-panel shadow-tarjeta mt-3 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line text-faint border-b text-left text-xs">
                  <th className="p-3 font-medium">Receta</th>
                  {d.recetas[0]?.dosificacion.map((x) => (
                    <th key={x.material} className="p-3 text-right font-medium">
                      {x.material}
                    </th>
                  ))}
                  <th className="p-3 text-right font-medium">Costo /m³</th>
                  <th className="p-3 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {d.recetas.map((r) => (
                  <tr key={r.codigo} className="border-line border-b last:border-0">
                    <td className="p-3">
                      <span className="font-mono font-medium">{r.codigo}</span>
                      <span className="text-faint ml-2 text-xs">
                        {r.cargas} {r.cargas === 1 ? 'carga' : 'cargas'}
                      </span>
                    </td>
                    {r.dosificacion.map((x) => (
                      <td key={x.material} className="p-3 text-right font-mono tabular-nums">
                        {dec(x.porM3)}
                        <span className="text-faint ml-0.5 text-xs">{x.unidad}</span>
                      </td>
                    ))}
                    <td className="p-3 text-right font-mono tabular-nums">
                      {$(Math.round(r.costoM3))}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {r.margenPct.toFixed(1).replace('.', ',')}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-faint mt-2 text-xs">
            La dosificación es por m³ y es la <span className="text-ink-soft">declarada</span>:
            la que manda es la del PLC. Si no coinciden, el problema está en el autómata y no
            se arregla calibrando una balanza.
          </p>
        </section>
      </main>
    </>
  );
}
