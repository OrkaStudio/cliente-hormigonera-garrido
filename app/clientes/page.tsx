import { perfilesClientes, todasLasCargas } from "@/lib/datos";
import { $, dec, fechaCorta, num } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const cargas = await todasLasCargas();
  const perfiles = perfilesClientes(cargas);
  const m3Total = perfiles.reduce((s, p) => s + p.m3, 0);
  const facturadoTotal = perfiles.reduce((s, p) => s + p.facturado, 0);
  const top = perfiles[0];
  const maxShare = top?.sharePct ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Clientes habituales</h1>
        <p className="mt-1 text-stone-500">
          {num(perfiles.length)} clientes · {dec(m3Total)} m³ despachados ·{" "}
          {$(facturadoTotal)} facturado
        </p>
      </div>

      {/* Quién manda en el volumen — lo que hoy vive en la cabeza del que atiende. */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tarjeta rotulo="Clientes en el período" valor={num(perfiles.length)} pie="con al menos una compra" />
        <Tarjeta rotulo="Cliente más grande" valor={top?.cliente ?? "—"} pie={`${dec(top?.m3 ?? 0)} m³ · ${dec(top?.sharePct ?? 0)}% del total`} />
        <Tarjeta rotulo="Ticket promedio" valor={`${dec(perfiles.length ? m3Total / cargas.length : 0)} m³`} pie="por carga despachada" />
        <Tarjeta rotulo="Top 3 concentra" valor={`${dec(perfiles.slice(0, 3).reduce((s, p) => s + p.sharePct, 0))}%`} pie="del volumen total" acento="amber" />
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-stone-200 bg-stone-50 px-6 py-3">
          <h2 className="font-semibold">Ranking por volumen</h2>
          <p className="text-sm text-stone-500">m³ comprados en el período</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="px-6 py-2.5 font-medium">Cliente</th>
              <th className="py-2.5 text-right font-medium">m³ comprados</th>
              <th className="py-2.5 pl-6 font-medium">Participación</th>
              <th className="py-2.5 text-right font-medium">Cargas</th>
              <th className="py-2.5 text-right font-medium">Ticket prom.</th>
              <th className="py-2.5 pl-6 font-medium">Receta habitual</th>
              <th className="py-2.5 text-right font-medium">Facturado</th>
              <th className="py-2.5 text-right font-medium">Margen</th>
              <th className="px-6 py-2.5 text-right font-medium">Última compra</th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((p) => (
              <tr key={p.cliente} className="border-b border-stone-100 last:border-0">
                <td className="px-6 py-3 font-medium">{p.cliente}</td>
                <td className="tabular py-3 text-right font-medium">{dec(p.m3)} m³</td>
                <td className="py-3 pl-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${Math.max((p.sharePct / maxShare) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="tabular text-xs text-stone-500">{dec(p.sharePct)}%</span>
                  </div>
                </td>
                <td className="tabular py-3 text-right text-stone-500">{num(p.cargas)}</td>
                <td className="tabular py-3 text-right text-stone-500">{dec(p.ticketM3)} m³</td>
                <td className="py-3 pl-6">
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium">
                    {p.recetaTop}
                  </span>
                </td>
                <td className="tabular py-3 text-right">{$(p.facturado)}</td>
                <td className="tabular py-3 text-right text-emerald-700">{dec(p.margenPct)}%</td>
                <td className="tabular px-6 py-3 text-right text-stone-500">
                  {fechaCorta(p.ultimaCompra)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-center text-xs text-stone-400">
        Demo — clientes y volúmenes simulados. Con los datos reales de la planta, es tu
        cartera de clientes: quién compra, cuánto y con qué margen.
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
  acento?: "amber";
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{rotulo}</p>
      <p
        className={`mt-2 text-xl font-bold ${
          acento === "amber" ? "text-amber-700" : "text-stone-900"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-sm text-stone-500">{pie}</p>
    </div>
  );
}
