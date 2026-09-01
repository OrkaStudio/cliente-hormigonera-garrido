'use client';

import { useEffect, useMemo, useState } from 'react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AjustarStock } from '@/components/materiales/ajustar-stock';
import { Cifra } from '@/components/dominio/cifra';
import { Estado } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import type { DatosMateriales } from '@/lib/datos/materiales';
import { leerAjustes, ultimoAjuste } from '@/lib/datos/ajustes-locales';
import { entradasLocales, leerCompras } from '@/lib/datos/compras-locales';
import { leerProveedores } from '@/lib/datos/proveedores-locales';
import { RegistrarCompra } from '@/components/materiales/registrar-compra';
import type { Compra, Proveedor } from '@/lib/datos/tipos';
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
import { $, dec, fechaDeMomento, num } from '@/lib/formato';
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

/**
 * El rótulo de una sección.
 *
 * Va AFUERA de la card y alineado con su borde, no adentro: la card es
 * lo que el rótulo nombra, así que el rótulo no puede vivir dentro de la
 * cosa que nombra.
 */
function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-base font-semibold tracking-tight uppercase">
      {children}
    </h2>
  );
}

export function PanelMateriales({ datos: d }: { datos: DatosMateriales }) {
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [nuevosProveedores, setNuevosProveedores] = useState<Proveedor[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setAjustes(leerAjustes());
    setCompras(leerCompras());
    setNuevosProveedores(leerProveedores());
    setMontado(true);
  }, []);

  /** Los sembrados más los que se dieron de alta cargando una compra. */
  const proveedores = useMemo(
    () => [...d.proveedores, ...nuevosProveedores],
    [d.proveedores, nuevosProveedores],
  );

  /* Lo cargado en este navegador sube el silo en el momento — es el
     criterio de terminado del apartado 6. El servidor lo recalcula
     entero en el próximo refresh. */
  const conEntradas = useMemo(
    () =>
      d.materiales.map((m) =>
        m.restante === null
          ? m
          : { ...m, restante: m.restante + entradasLocales(m.nombre, compras) },
      ),
    [d.materiales, compras],
  );

  /** El historial completo: lo sembrado y lo que se cargó recién. */
  const historial = useMemo(
    () =>
      [...compras, ...d.compras]
        .filter((c) => !c.anulada)
        .sort((a, b) => b.momento.localeCompare(a.momento)),
    [compras, d.compras],
  );

  const nombreProveedor = (id: string) =>
    proveedores.find((p) => p.id === id)?.nombre ?? id;

  /**
   * Quiénes le trajeron ESTE material, del más reciente al más viejo.
   *
   * Ya no es uno solo: al mismo material se le puede comprar a varios, y
   * cuál trajo la última vez es lo que se propone al cargar la compra.
   */
  const proveedoresDe = (material: string) => {
    const vistos = new Set<string>();
    const porCompra = historial
      .filter((c) => c.material === material)
      .map((c) => c.proveedorId)
      .filter((id) => !vistos.has(id) && vistos.add(id))
      .map((id) => proveedores.find((p) => p.id === id))
      .filter((p): p is Proveedor => Boolean(p));

    // Los que declaran proveerlo pero todavía no trajeron nada.
    const declarados = proveedores.filter(
      (p) => p.provee.includes(material) && !vistos.has(p.id),
    );

    return [...porCompra, ...declarados];
  };

  /* El que se acaba primero, arriba. Es la pregunta que trae José, y con
     el orden fijo de siempre había que compararlos a mano. El agua queda
     al final: no tiene días. */
  const conDias = useMemo(
    () =>
      conEntradas.map((m) => ({
        m,
        dias: m.sinStock || m.restante === null ? null : diasQueAguanta(m.restante, m.consumoDiario),
      })),
    [conEntradas],
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
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-2 [&>*]:min-w-0">
          <section>
            <Titulo>Stock</Titulo>
            <div className="border-line bg-card shadow-tarjeta divide-line mt-3 divide-y overflow-hidden rounded-lg border">
              {ordenados.map((m) => {
                const dias =
                  m.restante === null ? null : diasQueAguanta(m.restante, m.consumoDiario);
                const nivel = m.sinStock
                  ? 'sin-dato'
                  : nivelDeStock(dias, UMBRALES.diasParaReponer);
                const prop = proporcionDeDias(dias, maxDias);
                const sug = sugerenciaDeCompra(m);
                const ultimo = montado ? ultimoAjuste(m.nombre, ajustes) : null;
                const suyos = montado ? proveedoresDe(m.nombre) : [];
                const prov = suyos[0] ?? null;
                const merma = montado
                  ? mermaMedida(ajustes.filter((a) => a.material === m.nombre))
                  : null;

                return (
                  <article key={m.nombre} className="p-4">
                    {/* Los datos a la izquierda, los días a la derecha, y
                        la barra al pie a todo el ancho: la barra separa
                        las filas y no hay que buscarla entre líneas. */}
                    <div className="flex items-start justify-between gap-x-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading flex items-center gap-2 text-base font-semibold">
                          <span
                            className={cn('size-2.5 shrink-0 rounded-full', PUNTO[nivel])}
                            aria-hidden
                          />
                          {m.nombre}
                          {m.sinStock && <Estado className="ml-1">Sale del pozo</Estado>}
                        </h3>

                        <p className="text-muted-foreground num mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                          {m.sinStock ? (
                            <span className="font-sans">
                              Suministro del pozo: se consume, pero no hay existencia que cuidar.
                            </span>
                          ) : (
                            <>
                              <span>Consume {num(m.consumoDiario)} {m.unidad}/día</span>
                              {m.capacidad !== null && (
                                <span>Capacidad {num(m.capacidad)} {m.unidad}</span>
                              )}
                              {m.costo !== null && m.costo > 0 && (
                                <span
                                  title={
                                    m.costoDe
                                      ? `Sale de la última compra. El precio que se pagó es el que vale para reponer hoy.`
                                      : 'Todavía no hay compras cargadas de este material'
                                  }
                                >
                                  {m.costo < 100 ? `$ ${dec(m.costo)}` : $(Math.round(m.costo))}/
                                  {m.unidad}
                                  <span className="text-faint font-sans">
                                    {m.costoDe
                                      ? ` · última compra ${fechaDeMomento(m.costoDe)}`
                                      : ' · sin compras'}
                                  </span>
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      {!m.sinStock && (
                        <div className="shrink-0 text-right">
                          {dias === null ? (
                            <Estado tono="warn">Sin dato</Estado>
                          ) : (
                            <>
                              <span className={cn('num text-xl font-semibold', TEXTO[nivel])}>
                                {dias} {dias === 1 ? 'día' : 'días'}
                              </span>
                              <span className="text-faint num block text-xs">
                                {num(m.restante ?? 0)} / {num(m.capacidad ?? 0)} {m.unidad}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {!m.sinStock && prop !== null && (
                      /* La barra mide DÍAS contra el que más aguanta, no el
                         llenado del silo. Con el llenado, el aditivo va al
                         39% de capacidad y es el que MEJOR está: la barra
                         y el color decían cosas opuestas. */
                      <div
                        className="bg-sunk mt-3 h-1.5 overflow-hidden rounded-full"
                        role="img"
                        aria-label={`Aguanta ${dias} de los ${maxDias} días del material que más dura`}
                      >
                        <div
                          className={cn('h-full rounded-full', BARRA[nivel])}
                          style={{ width: `${Math.max(prop, 2)}%` }}
                        />
                      </div>
                    )}

                    <div className="text-faint mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className={m.medidoPorPlc ? 'text-plc-text' : 'text-warn-text'}>
                        {m.medidoPorPlc ? 'lo pesa el PLC' : 'no lo pesa el PLC'}
                      </span>
                      {sug && (
                        <span>
                          entran <span className="num">{num(sug.cantidad)}</span> {sug.unidad} más
                        </span>
                      )}
                      {merma && (
                        <span>
                          merma medida{' '}
                          <span className="text-ink num">
                            {merma.pct.toFixed(1).replace('.', ',')}%
                          </span>
                        </span>
                      )}
                      {/* A quién llamar cuando falta. Es un `tel:` porque
                          desde el teléfono se marca de una (R6 del ap. 6).
                          Si le compró a varios, están todos: al que trajo
                          la última vez puede no atenderle. */}
                      {suyos.map((p) => (
                        <a
                          key={p.id}
                          href={`tel:${p.telefono.replace(/[^\d+]/g, '')}`}
                          className="hover:text-ink underline-offset-2 hover:underline"
                        >
                          {p.nombre}
                          {p.telefono && <> · <span className="num">{p.telefono}</span></>}
                        </a>
                      ))}
                      {!m.sinStock && m.restante !== null && (
                        <span className="ml-auto flex items-center gap-4">
                          <RegistrarCompra
                            material={m.nombre}
                            unidadCompra={m.unidadCompra ?? m.unidad}
                            unidadPlanta={m.unidad}
                            factorConversion={m.factorConversion ?? 1}
                            proveedores={proveedores}
                            sugerido={prov}
                            ultima={m.ultimaCompra}
                            entran={sug?.cantidad ?? null}
                            restante={m.restante}
                            capacidad={m.capacidad}
                            onCompra={setCompras}
                            onProveedor={setNuevosProveedores}
                          />
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

                    {/* De dónde sale el número. El cartel decía "se deduce"
                        y el número era una constante; ahora se puede leer
                        la resta entera. */}
                    {!m.sinStock && m.deduccion.hayDato && (
                      <p className="text-faint mt-1.5 text-xs">
                        <span className="num">{num(m.deduccion.partida)}</span> contados el{' '}
                        {fechaDeMomento(m.deduccion.desde!)}
                        {' + '}
                        <span className="num">{num(m.deduccion.entradas)}</span> que entraron
                        {' − '}
                        <span className="num">{num(m.deduccion.consumo)}</span> que se
                        consumieron
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* El apartado 6, adentro. Va DESPUÉS del stock porque es su
              respaldo: se entra a la pantalla a ver cuánto queda, y el
              historial es lo que explica por qué queda eso. */}
          <section>
            <Titulo>Compras</Titulo>
            <div className="border-line bg-card shadow-tarjeta mt-3 overflow-hidden rounded-lg border">
              {historial.length === 0 ? (
                <EstadoVacio
                  className="m-4"
                  titulo="Todavía no hay compras cargadas"
                  descripcion="Sin compras el stock no se puede deducir: es la mitad de arriba de la resta."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-line text-faint border-b text-left text-xs">
                        <th className="px-3 py-3 font-medium">Fecha</th>
                        <th className="px-2 py-3 font-medium">Material</th>
                        <th className="w-full px-2 py-3 font-medium">Proveedor</th>
                        <th className="px-2 py-3 text-right font-medium">Cantidad</th>
                        <th className="px-2 py-3 text-right font-medium whitespace-nowrap">
                          Precio
                        </th>
                        <th className="px-2 py-3 text-right font-medium">Total</th>
                        <th className="px-3 py-3 text-right font-medium">Remito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-line divide-y">
                      {historial.slice(0, 12).map((c) => (
                        <tr key={c.id}>
                          <td className="num px-3 py-2.5 whitespace-nowrap">
                            {fechaDeMomento(c.momento)}
                          </td>
                          <td className="px-2 py-2.5 whitespace-nowrap">{c.material}</td>
                          <td className="text-muted-foreground px-2 py-2.5">
                            {nombreProveedor(c.proveedorId)}
                          </td>
                          <td className="num px-2 py-2.5 text-right whitespace-nowrap">
                            {num(c.cantidad)} <span className="text-faint">{c.unidadCompra}</span>
                          </td>
                          <td className="num px-2 py-2.5 text-right whitespace-nowrap">
                            {$(c.precioUnitario)}
                          </td>
                          <td className="num px-2 py-2.5 text-right whitespace-nowrap">
                            {$(c.total)}
                          </td>
                          <td className="num text-faint px-3 py-2.5 text-right whitespace-nowrap">
                            {c.remito ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-faint mt-2 text-xs">
              El precio se guarda por unidad de compra —lo que dice el remito— y la app lo
              convierte a la unidad del silo. El costo de reponer que se muestra arriba sale de
              la <span className="text-ink-soft">última</span> compra, no de un promedio.
            </p>
          </section>

          {/* El cruce que faltaba: stock y recetas viven en la misma
              pantalla y no se hablaban.

              Capacidad y Recetas son DOS secciones y no una: metidas en
              la misma, la grilla de dos columnas las apilaba juntas en la
              izquierda y dejaba la derecha entera vacía. */}
          <section>
            <Titulo>Capacidad de producción</Titulo>
            <div className="border-line bg-card shadow-tarjeta divide-line mt-3 divide-y overflow-hidden rounded-lg border">
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

            <p className="text-faint mt-2 text-xs">
              Con lo que hay en los silos. Manda el material que menos da: da igual que
              sobren áridos si el cemento no llega.
            </p>
          </section>

          <section>
            <Titulo>Recetas · dosificación por m³</Titulo>
            <div className="border-line bg-panel shadow-tarjeta mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-line text-faint border-b text-left text-xs">
                  <th className="px-3 py-3 font-medium">Receta</th>
                  {d.recetas[0]?.dosificacion.map((x) => (
                    <th key={x.material} className="px-2 py-3 text-right font-medium">
                      {x.material}
                      <span className="text-faint ml-1 font-normal">({x.unidad})</span>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-right font-medium whitespace-nowrap">Costo /m³</th>
                  <th className="px-3 py-3 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {d.recetas.map((r) => (
                  <tr key={r.codigo} className="border-line border-b last:border-0">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono font-medium">{r.codigo}</span>
                      <span
                        className="text-faint ml-2 text-xs"
                        title={`${r.cargas} ${r.cargas === 1 ? 'carga' : 'cargas'} producidas`}
                      >
                        ×{r.cargas}
                      </span>
                    </td>
                    {r.dosificacion.map((x) => (
                      <td
                        key={x.material}
                        className="px-2 py-3 text-right font-mono whitespace-nowrap tabular-nums"
                      >
                        {dec(x.porM3)}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                      {$(Math.round(r.costoM3))}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
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
              se arregla calibrando una balanza. Los costos por unidad salen de la{' '}
              <span className="text-ink-soft">última compra</span> de cada material, así que el
              margen se mueve con lo que subió el proveedor.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
