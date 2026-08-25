'use client';

import { useEffect, useMemo, useState } from 'react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AjustarStock } from '@/components/materiales/ajustar-stock';
import { Cifra } from '@/components/dominio/cifra';
import { Estado } from '@/components/dominio/estado';
import type { DatosMateriales } from '@/lib/datos/materiales';
import { leerAjustes, ultimoAjuste } from '@/lib/datos/ajustes-locales';
import {
  cuantoSale,
  diasQueAguanta,
  mermaMedida,
  nivelDeStock,
  proporcionDeDias,
  sugerenciaDeCompra,
  type AjusteStock,
  type NivelStock,
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
/** El color del semáforo, escrito entero: Tailwind no ve las clases armadas. */
const PUNTO: Record<NivelStock, string> = {
  quiebre: 'bg-danger',
  bajo: 'bg-warn',
  ok: 'bg-ok',
  'sin-dato': 'bg-line-strong',
};

const TEXTO: Record<NivelStock, string> = {
  quiebre: 'text-danger-text',
  bajo: 'text-warn-text',
  ok: 'text-ok-text',
  'sin-dato': 'text-faint',
};

const BARRA: Record<NivelStock, string> = {
  quiebre: 'bg-danger',
  bajo: 'bg-warn',
  ok: 'bg-ok',
  'sin-dato': 'bg-line-strong',
};

export function PanelMateriales({ datos: d }: { datos: DatosMateriales }) {
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setAjustes(leerAjustes());
    setMontado(true);
  }, []);

  /* El que se acaba primero, arriba. Es la pregunta que trae José, y con
     el orden fijo de siempre había que compararlos a mano. El agua queda
     al final: no tiene días. */
  const conDias = useMemo(
    () =>
      d.materiales.map((m) => ({
        m,
        dias: m.sinStock || m.restante === null ? null : diasQueAguanta(m.restante, m.consumoDiario),
      })),
    [d.materiales],
  );

  const ordenados = useMemo(
    () =>
      [...conDias]
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
        .map((x) => x.m),
    [conDias],
  );

  /** El que más aguanta marca la escala de las barras. */
  const maxDias = Math.max(...conDias.map((x) => x.dias ?? 0), 1);

  const salidas = useMemo(
    () => d.recetas.map((r) => cuantoSale(r, d.materiales)).filter((x) => x !== null),
    [d.recetas, d.materiales],
  );

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

        {/* Los cuatro en UNA lista, no en cuatro tarjetas. Separados no se
            podían comparar: cada barra tenía su propia escala y cuál
            estaba peor había que deducirlo a mano. */}
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="border-line bg-card shadow-tarjeta overflow-hidden rounded-lg border">
            <h2 className="rotulo-obra text-faint px-4 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
              Stock
            </h2>

            <div className="divide-line divide-y border-t-0">
              {ordenados.map((m) => {
                const dias =
                  m.restante === null ? null : diasQueAguanta(m.restante, m.consumoDiario);
                const nivel = m.sinStock
                  ? 'sin-dato'
                  : nivelDeStock(dias, UMBRALES.diasParaReponer);
                const prop = proporcionDeDias(dias, maxDias);
                const sug = sugerenciaDeCompra(m);
                const ultimo = montado ? ultimoAjuste(m.nombre, ajustes) : null;
                const merma = montado
                  ? mermaMedida(ajustes.filter((a) => a.material === m.nombre))
                  : null;

                return (
                  <article key={m.nombre} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-heading flex items-center gap-2 text-base font-semibold">
                        <span
                          className={cn('size-2.5 shrink-0 rounded-full', PUNTO[nivel])}
                          aria-hidden
                        />
                        {m.nombre}
                      </h3>

                      {/* Los días son la respuesta; los kilos, el respaldo. */}
                      {m.sinStock ? (
                        <Estado>Sale del pozo</Estado>
                      ) : dias === null ? (
                        <Estado tono="warn">Sin dato</Estado>
                      ) : (
                        <span className="text-right">
                          <span className={cn('num text-xl font-semibold', TEXTO[nivel])}>
                            {dias} {dias === 1 ? 'día' : 'días'}
                          </span>
                          <span className="text-faint num block text-xs">
                            {num(m.restante ?? 0)} de {num(m.capacidad ?? 0)} {m.unidad}
                          </span>
                        </span>
                      )}
                    </div>

                    {!m.sinStock && prop !== null && (
                      /* La barra mide DÍAS contra el que más aguanta, no el
                         llenado del silo. Con el llenado, el aditivo va al
                         39% de capacidad y es el que MEJOR está: la barra
                         y el color decían cosas opuestas. */
                      <div
                        className="bg-sunk mt-2.5 h-1.5 overflow-hidden rounded-full"
                        role="img"
                        aria-label={`Aguanta ${dias} de los ${maxDias} días del material que más dura`}
                      >
                        <div
                          className={cn('h-full rounded-full', BARRA[nivel])}
                          style={{ width: `${Math.max(prop, 2)}%` }}
                        />
                      </div>
                    )}

                    <div className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                      {m.sinStock ? (
                        <span>Suministro del pozo: se consume, pero no hay existencia que cuidar.</span>
                      ) : (
                        <>
                          <span>
                            consume <span className="num">{num(m.consumoDiario)}</span> {m.unidad}
                            /día
                          </span>
                          {sug && (
                            <span>
                              entran <span className="num">{num(sug.cantidad)}</span> {sug.unidad}{' '}
                              más
                            </span>
                          )}
                          {m.costo !== null && m.costo > 0 && (
                            <span title="Provisorio hasta que exista Compras">
                              <span className="num">
                                {m.costo < 100 ? `$ ${dec(m.costo)}` : $(m.costo)}
                              </span>
                              <span className="text-faint">/{m.unidad} · provisorio</span>
                            </span>
                          )}
                        </>
                      )}
                      <span className={m.medidoPorPlc ? 'text-plc-text' : 'text-warn-text'}>
                        {m.medidoPorPlc ? 'lo pesa el PLC' : 'no lo pesa el PLC'}
                      </span>

                      {merma && (
                        <span>
                          merma medida{' '}
                          <span className="text-ink num">
                            {merma.pct.toFixed(1).replace('.', ',')}%
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

          {/* El cruce que faltaba: stock y recetas viven en la misma
              pantalla y no se hablaban. */}
          <section>
            <div className="border-line bg-card shadow-tarjeta overflow-hidden rounded-lg border">
            <h2 className="rotulo-obra text-faint px-4 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
              Cuánto puedo producir
            </h2>

            <div className="divide-line divide-y">
              {salidas.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Sin stock deducido no se puede estimar cuánto sale.
                </p>
              ) : (
                salidas.map((s) => (
                  <div
                    key={s.receta}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <span>
                      <span className="num block text-sm font-medium">{s.receta}</span>
                      <span className="text-warn-text text-[11px] font-semibold tracking-[0.06em] uppercase">
                        frena: {s.frena}
                      </span>
                    </span>
                    <Cifra valor={num(s.m3)} unidad="m³" tamano="lg" />
                  </div>
                ))
              )}
            </div>
            </div>

            <p className="text-faint mt-2 text-xs">
              Con lo que hay en los silos. Manda el material que menos da: da igual que
              sobren áridos si el cemento no llega.
            </p>
          </section>
        </div>

        <section className="mt-8">
          <div className="border-line bg-panel shadow-tarjeta overflow-hidden rounded-lg border">
          <h2 className="rotulo-obra text-faint px-4 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
            Recetas
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line text-faint border-b text-left text-xs">
                  <th className="px-4 py-3 font-medium">Receta</th>
                  {d.recetas[0]?.dosificacion.map((x) => (
                    <th key={x.material} className="px-4 py-3 text-right font-medium">
                      {x.material}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Costo /m³</th>
                  <th className="px-4 py-3 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {d.recetas.map((r) => (
                  <tr key={r.codigo} className="border-line border-b last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{r.codigo}</span>
                      <span className="text-faint ml-2 text-xs">
                        {r.cargas} {r.cargas === 1 ? 'carga' : 'cargas'}
                      </span>
                    </td>
                    {r.dosificacion.map((x) => (
                      <td key={x.material} className="px-4 py-3 text-right font-mono tabular-nums">
                        {dec(x.porM3)}
                        <span className="text-faint ml-0.5 text-xs">{x.unidad}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {$(Math.round(r.costoM3))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.margenPct.toFixed(1).replace('.', ',')}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <p className="text-faint mt-2 text-xs">
            La dosificación es por m³ y es la <span className="text-ink-soft">declarada</span>:
            la que manda es la del PLC. Si no coinciden, el problema está en el autómata y no
            se arregla calibrando una balanza. Los costos por kilo son{' '}
            <span className="text-ink-soft">provisorios</span> hasta que exista Compras.
          </p>
        </section>

      </main>
    </>
  );
}
