import { parametros, todasLasCargas, totalizar } from "@/lib/datos";
import { $, dec, fechaLarga, hora, kg, num, signo } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Historial() {
  const [p, cargas] = await Promise.all([parametros(), todasLasCargas()]);
  const t = totalizar(cargas, p.costo_cemento_kg);

  // Cada carga bajo el día que la produjo — así lo lee un dueño de planta.
  const porDia = new Map<string, typeof cargas>();
  for (const c of cargas) {
    const dia = c.fecha_hora_inicio.slice(0, 10);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Historial de cargas</h1>
        <p className="mt-1 text-stone-500">
          {num(t.cargas)} cargas · {dec(t.m3)} m³ · {$(t.facturado)} facturado ·{" "}
          <span className="text-emerald-700">{$(t.margen)} de margen</span>
        </p>
      </div>

      {[...porDia.entries()].map(([dia, delDia]) => {
        const td = totalizar(delDia, p.costo_cemento_kg);
        return (
          <section
            key={dia}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-stone-200 bg-stone-50 px-6 py-3">
              <h2 className="font-semibold first-letter:uppercase">{fechaLarga(dia)}</h2>
              <p className="tabular text-sm text-stone-500">
                {num(td.cargas)} cargas · {dec(td.m3)} m³ · margen{" "}
                <span className="font-medium text-emerald-700">{$(td.margen)}</span> ·
                cemento de más{" "}
                <span className="font-medium text-red-600">
                  {signo(td.cementoRegalado)}
                </span>
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-6 py-2.5 font-medium">Hora</th>
                  <th className="py-2.5 font-medium">Receta</th>
                  <th className="py-2.5 text-right font-medium">m³</th>
                  <th className="py-2.5 text-right font-medium">Cemento</th>
                  <th className="py-2.5 text-right font-medium">Agua</th>
                  <th className="py-2.5 text-right font-medium">Áridos</th>
                  <th className="py-2.5 text-right font-medium">Duración</th>
                  <th className="py-2.5 text-right font-medium">Costo real</th>
                  <th className="py-2.5 text-right font-medium">Margen</th>
                  <th className="px-6 py-2.5 font-medium">Operador</th>
                </tr>
              </thead>
              <tbody>
                {delDia.map((c) => (
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
                    <Material real={c.cemento_real} desvio={c.desvio_cemento} />
                    <Material real={c.agua_real} desvio={c.desvio_agua} unidad="l" />
                    <Material real={c.aridos_real} desvio={c.desvio_aridos} />
                    <td className="tabular py-3 text-right text-stone-500">
                      {dec(c.duracion_min)} min
                    </td>
                    <td className="tabular py-3 text-right">{$(c.costo_real)}</td>
                    <td className="tabular py-3 text-right font-medium text-emerald-700">
                      {$(c.margen)}
                    </td>
                    <td className="px-6 py-3 text-stone-500">{c.operador}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

/** Lo que entró de verdad, con el desvío contra la receta debajo. */
function Material({
  real,
  desvio,
  unidad = "kg",
}: {
  real: number;
  desvio: number;
  unidad?: string;
}) {
  // ±0.8% es ruido de balanza; más que eso, se marca.
  const relevante = Math.abs(desvio) > Math.abs(real) * 0.008;
  return (
    <td className="tabular py-3 text-right">
      <div>{unidad === "l" ? `${num(real)} l` : kg(real)}</div>
      <div
        className={`text-xs ${
          !relevante
            ? "text-stone-400"
            : desvio > 0
              ? "text-red-600"
              : "text-amber-600"
        }`}
      >
        {signo(desvio, unidad)}
      </div>
    </td>
  );
}
