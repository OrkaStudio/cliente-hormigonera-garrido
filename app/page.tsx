import Link from "next/link";
import {
  cargasDelDia,
  desvioPorReceta,
  parametros,
  porDia,
  todasLasCargas,
  totalizar,
  ultimoDia,
} from "@/lib/datos";
import { $, dec, fechaCorta, fechaLarga, hora, kg, num, signo } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Resumen() {
  const [dia, p, historia] = await Promise.all([
    ultimoDia(),
    parametros(),
    todasLasCargas(),
  ]);
  const hoy = await cargasDelDia(dia);

  const t = totalizar(hoy, p.costo_cemento_kg);
  const th = totalizar(historia, p.costo_cemento_kg);
  const dias = porDia(historia).slice(-14);
  const maxM3 = Math.max(...dias.map((d) => d.m3), 1);
  const fugas = desvioPorReceta(historia, p.costo_cemento_kg);
  const desdeDia = porDia(historia)[0]?.dia ?? dia;
  const cementoPedido = historia.reduce((s, c) => s + Number(c.cemento_objetivo), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resumen del día</h1>
          <p className="mt-1 text-stone-500 first-letter:uppercase">{fechaLarga(dia)}</p>
        </div>
        <p className="text-sm text-stone-500">
          Última carga a las {hoy[0] ? hora(hoy[0].fecha_hora_inicio) : "—"}
        </p>
      </div>

      {/* Lo que produjo la planta hoy, sin que José se moviera de Flores. */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tarjeta rotulo="Cargas del día" valor={num(t.cargas)} pie="camiones despachados" />
        <Tarjeta rotulo="Producción" valor={`${dec(t.m3)} m³`} pie="hormigón elaborado" />
        <Tarjeta rotulo="Facturado" valor={$(t.facturado)} pie="a precio de lista" />
        <Tarjeta
          rotulo="Margen del día"
          valor={$(t.margen)}
          pie={`${dec((t.margen / t.facturado) * 100)}% sobre la venta`}
          acento="emerald"
        />
      </section>

      {/* El hallazgo: el dato que solo aparece cuando alguien lo acumula. */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-wider text-red-700 uppercase">
              Desvío detectado — balanza de cemento
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              La planta carga{" "}
              <span className="text-red-700">
                {dec((th.cementoRegalado / cementoPedido) * 100)}% más cemento
              </span>{" "}
              del que pide la receta
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              En cada carga entran unos kilos de más. En la pantalla de la planta no se
              nota: el número pasa y se va. Acumulado desde el {fechaCorta(desdeDia)},
              son <strong>{kg(th.cementoRegalado)}</strong> de cemento regalado.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold tracking-wider text-red-700 uppercase">
              Plata perdida
            </p>
            <p className="tabular mt-1 text-4xl font-bold text-red-700">
              {$(th.plataRegalada)}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              en {num(th.cargas)} cargas · {dec(th.m3)} m³
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-stone-200 bg-white p-6 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Producción de las últimas 2 semanas</h2>
            <p className="text-sm text-stone-500">m³ por día</p>
          </div>

          <div className="mt-6 flex h-52 items-stretch gap-2">
            {dias.map((d) => (
              <div
                key={d.dia}
                className="group flex flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="tabular text-xs font-medium text-stone-400">
                  {dec(d.m3)}
                </span>
                {/* El % es sobre la columna, que sí tiene altura (h-52 del padre). */}
                <div
                  className="w-full rounded-t bg-amber-400 transition-colors group-hover:bg-amber-500"
                  style={{ height: `${Math.max((d.m3 / maxM3) * 82, 3)}%` }}
                />
                <span className="tabular text-[11px] text-stone-500">
                  {fechaCorta(d.dia)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <h2 className="font-semibold">Dónde se va el cemento</h2>
          <p className="mt-1 text-sm text-stone-500">
            Desvío de cemento acumulado, por receta
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="pb-2 font-medium">Receta</th>
                <th className="pb-2 text-right font-medium">Cargas</th>
                <th className="pb-2 text-right font-medium">Desvío</th>
                <th className="pb-2 text-right font-medium">Plata</th>
              </tr>
            </thead>
            <tbody>
              {fugas.map((f) => (
                <tr key={f.receta} className="border-b border-stone-100 last:border-0">
                  <td className="py-2.5 font-medium">{f.receta}</td>
                  <td className="tabular py-2.5 text-right text-stone-500">
                    {num(f.cargas)}
                  </td>
                  <td className="tabular py-2.5 text-right text-red-600">
                    +{dec(f.desvioPct)}%
                  </td>
                  <td className="tabular py-2.5 text-right font-medium text-red-700">
                    {$(f.plata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="font-semibold">Cargas de hoy</h2>
          <Link
            href="/cargas"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            Ver historial completo →
          </Link>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="px-6 py-2.5 font-medium">Hora</th>
              <th className="py-2.5 font-medium">Receta</th>
              <th className="py-2.5 text-right font-medium">m³</th>
              <th className="py-2.5 text-right font-medium">Cemento receta</th>
              <th className="py-2.5 text-right font-medium">Cemento real</th>
              <th className="py-2.5 text-right font-medium">Desvío</th>
              <th className="py-2.5 text-right font-medium">Margen</th>
              <th className="px-6 py-2.5 font-medium">Operador</th>
            </tr>
          </thead>
          <tbody>
            {hoy.map((c) => (
              <tr key={c.id} className="border-b border-stone-100 last:border-0">
                <td className="tabular px-6 py-3 text-stone-500">
                  {hora(c.fecha_hora_inicio)}
                </td>
                <td className="py-3">
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium">
                    {c.receta}
                  </span>
                </td>
                <td className="tabular py-3 text-right font-medium">{dec(c.m3)}</td>
                <td className="tabular py-3 text-right text-stone-500">
                  {kg(c.cemento_objetivo)}
                </td>
                <td className="tabular py-3 text-right">{kg(c.cemento_real)}</td>
                <td className="tabular py-3 text-right font-medium text-red-600">
                  {signo(c.desvio_cemento)}
                </td>
                <td className="tabular py-3 text-right text-emerald-700">
                  {$(c.margen)}
                </td>
                <td className="px-6 py-3 text-stone-500">{c.operador}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-center text-xs text-stone-400">
        Demo — producción simulada. Precios estimados de mercado (cemento{" "}
        {$(p.costo_cemento_kg)}/kg · venta {$(p.precio_venta_m3)}/m³): se ajustan con
        los valores reales de la planta.
      </p>
    </div>
  );
}

function Tarjeta({
  rotulo,
  valor,
  pie,
  acento,
}: {
  rotulo: string;
  valor: string;
  pie: string;
  acento?: "emerald";
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
        {rotulo}
      </p>
      <p
        className={`tabular mt-2 text-3xl font-bold ${
          acento === "emerald" ? "text-emerald-700" : "text-stone-900"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-sm text-stone-500">{pie}</p>
    </div>
  );
}
