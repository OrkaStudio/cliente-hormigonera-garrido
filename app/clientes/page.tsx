import { CircleCheck, CircleX } from 'lucide-react';

import { BarraSuperior } from '@/components/app/barra-superior';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { ListaClientes } from '@/components/clientes/lista-clientes';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { traerClientes } from '@/lib/datos/clientes';
import { ordenarRanking } from '@/lib/dominio/clientes';
import { $, dec, num } from '@/lib/formato';

/**
 * Apartado 4 — Clientes.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-4-clientes.md
 *
 * Objetivo del apartado: saber quién compra y cuánto. La otra mitad del
 * objetivo original — "a qué precio y con qué margen" — no está acá: el
 * precio vive en la venta (apartado 3) y el margen necesita los costos
 * del apartado 5. Ninguno de los dos existe todavía.
 */

// Los resúmenes se derivan del momento de la consulta: sin esto, el
// build congela "hoy" en la fecha del deploy.
export const dynamic = 'force-dynamic';

export default async function Clientes() {
  const clientes = await traerClientes();
  const activos = clientes.filter((c) => c.activo).length;
  const inactivos = clientes.length - activos;

  // Todo sale de lo que la consulta ya trajo: ni una llamada de mas.
  const m3 = clientes.reduce((a, c) => a + c.resumen.m3, 0);
  const facturado = clientes.reduce((a, c) => a + c.resumen.facturado, 0);
  // Del ranking, no de la lista entera: Mostrador es la venta suelta y
  // no puede ser "el que más lleva".
  const mayor = ordenarRanking(clientes, 'volumen').ranking[0];

  return (
    <>
      <BarraSuperior activo="Clientes" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <EncabezadoPagina
          titulo="Clientes"
          bajada={
            <>
              {activos} {activos === 1 ? 'activo' : 'activos'}
              {mayor && (
                <>
                  . <span className="text-ink font-medium">{mayor.nombre}</span> es el que
                  más lleva
                </>
              )}
              . Los m³ y lo facturado salen de las cargas que tienen asignadas.
            </>
          }
        />

        {/* Dos totales y un conteo. Antes eran tres tarjetas iguales y el
            número 5 pesaba lo mismo que trescientos veintiocho millones:
            un conteo de clientes no es una cifra de la planta. El conteo
            baja a superficie hundida, que es donde va lo que se consulta
            y no se mira. */}
        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <TarjetaKpi
            rotulo="Comprado entre todos"
            valor={dec(m3)}
            unidad="m³"
            pie="volumen asignado a un cliente"
          />
          <TarjetaKpi rotulo="Facturado" valor={$(facturado)} pie="de las cargas asignadas" />

          <div className="border-line bg-sunk grid content-center gap-2.5 rounded-lg border px-5 py-4 lg:w-56">
            <p className="flex items-baseline gap-2.5">
              <CircleCheck className="text-ok size-4 shrink-0 self-center" aria-hidden />
              <span className="num text-lg font-semibold">{num(activos)}</span>
              <span className="text-muted-foreground text-sm">
                {activos === 1 ? 'cliente activo' : 'clientes activos'}
              </span>
            </p>
            <p className="border-line flex items-baseline gap-2.5 border-t pt-2.5">
              <CircleX className="text-faint size-4 shrink-0 self-center" aria-hidden />
              <span className="num text-lg font-semibold">{num(inactivos)}</span>
              <span className="text-muted-foreground text-sm">
                {inactivos === 1 ? 'inactivo' : 'inactivos'}
              </span>
            </p>
          </div>
        </section>

        <ListaClientes sembrados={clientes} totalM3={m3} />
      </main>
    </>
  );
}
