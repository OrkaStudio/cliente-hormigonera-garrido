import {
  composicionCosto,
  parametros,
  rentabilidadPorReceta,
  todasLasCargas,
  totalizar,
} from "@/lib/datos";
import { $, dec, num } from "@/lib/formato";

export const dynamic = "force-dynamic";

const MATERIALES = [
  { k: "cemento" as const, label: "Cemento", color: "bg-amber-500" },
  { k: "aridos" as const, label: "Áridos", color: "bg-stone-400" },
  { k: "agua" as const, label: "Agua", color: "bg-sky-400" },
  { k: "aditivo" as const, label: "Aditivo", color: "bg-violet-400" },
];

export default async function Rentabilidad() {
  const [p, cargas] = await Promise.all([parametros(), todasLasCargas()]);
  const t = totalizar(cargas, p.costo_cemento_kg);
  const rent = rentabilidadPorReceta(cargas, p);
  const comp = composicionCosto(cargas, p);

  const ventaM3 = t.m3 ? t.facturado / t.m3 : 0;
  const costoRealM3 = t.m3 ? t.costo / t.m3 : 0;
  const margenM3 = t.m3 ? t.margen / t.m3 : 0;
  const margenPct = t.facturado ? (t.margen / t.facturado) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Rentabilidad por m³</h1>
        <p className="mt-1 text-stone-500">
          Lo que cuesta de verdad cada m³ y lo que deja — con tus precios de hoy
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tarjeta rotulo="Precio de lista" valor={`${$(ventaM3)}`} pie="por m³ vendido" />
        <Tarjeta rotulo="Costo real prom." valor={`${$(costoRealM3)}`} pie="por m³ producido" />
        <Tarjeta rotulo="Margen promedio" valor={`${$(margenM3)}`} pie="por m³" acento="emerald" />
        <Tarjeta rotulo="Margen" valor={`${dec(margenPct)}%`} pie="sobre la venta" acento="emerald" />
      </section>

      {/* En qué se va el costo real — refuerza dónde pega un desvío. */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">En qué se va el costo</h2>
          <p className="text-sm text-stone-500">composición del costo real de materiales</p>
        </div>

        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          {MATERIALES.map((m) => (
            <div
              key={m.k}
              className={m.color}
              style={{ width: `${comp.pct[m.k]}%` }}
              title={`${m.label} ${dec(comp.pct[m.k])}%`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {MATERIALES.map((m) => (
            <div key={m.k} className="flex items-center gap-2 text-sm">
              <span className={`h-3 w-3 rounded-sm ${m.color}`} />
              <span className="font-medium">{m.label}</span>
              <span className="tabular text-stone-500">
                {dec(comp.pct[m.k])}% · {$(comp[m.k])}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-stone-200 bg-stone-50 px-6 py-3">
          <h2 className="font-semibold">Por receta</h2>
          <p className="text-sm text-stone-500">de la más a la menos rentable</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="px-6 py-2.5 font-medium">Receta</th>
              <th className="py-2.5 text-right font-medium">Cargas</th>
              <th className="py-2.5 text-right font-medium">m³</th>
              <th className="py-2.5 text-right font-medium">Venta/m³</th>
              <th className="py-2.5 text-right font-medium">Costo receta/m³</th>
              <th className="py-2.5 text-right font-medium">Costo real/m³</th>
              <th className="py-2.5 text-right font-medium">Margen/m³</th>
              <th className="px-6 py-2.5 text-right font-medium">Margen %</th>
            </tr>
          </thead>
          <tbody>
            {rent.map((r) => (
              <tr key={r.receta} className="border-b border-stone-100 last:border-0">
                <td className="px-6 py-3">
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium">
                    {r.receta}
                  </span>
                </td>
                <td className="tabular py-3 text-right text-stone-500">{num(r.cargas)}</td>
                <td className="tabular py-3 text-right text-stone-500">{dec(r.m3)}</td>
                <td className="tabular py-3 text-right">{$(r.ventaM3)}</td>
                <td className="tabular py-3 text-right text-stone-500">{$(r.costoObjetivoM3)}</td>
                <td className="tabular py-3 text-right">{$(r.costoRealM3)}</td>
                <td className="tabular py-3 text-right font-medium text-emerald-700">
                  {$(r.margenM3)}
                </td>
                <td className="tabular px-6 py-3 text-right font-medium text-emerald-700">
                  {dec(r.margenPct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-center text-xs text-stone-400">
        Demo — precios estimados de mercado (cemento {$(p.costo_cemento_kg)}/kg · venta{" "}
        {$(p.precio_venta_m3)}/m³). Con los valores reales de la planta, es tu rentabilidad
        exacta por m³.
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
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{rotulo}</p>
      <p
        className={`tabular mt-2 text-2xl font-bold ${
          acento === "emerald" ? "text-emerald-700" : "text-stone-900"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-sm text-stone-500">{pie}</p>
    </div>
  );
}
