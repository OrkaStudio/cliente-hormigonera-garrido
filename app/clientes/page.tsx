import { BarraSuperior } from '@/components/app/barra-superior';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { ListaClientes } from '@/components/clientes/lista-clientes';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { traerClientes } from '@/lib/datos/clientes';
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

  // Todo sale de lo que la consulta ya trajo: ni una llamada de mas.
  const m3 = clientes.reduce((a, c) => a + c.resumen.m3, 0);
  const facturado = clientes.reduce((a, c) => a + c.resumen.facturado, 0);
  const mayor = [...clientes].sort((a, b) => b.resumen.m3 - a.resumen.m3)[0];

  return (
    <>
      <BarraSuperior activo="Clientes" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <EncabezadoPagina
          titulo="Clientes"
          bajada={
            <>
              {activos} {activos === 1 ? 'activo' : 'activos'} de {clientes.length}.
              Los m³ y lo facturado salen de las cargas que tienen asignadas.
            </>
          }
        />

        {/* Era la única pantalla sin resumen arriba: se entraba directo a
            la tabla sin saber de qué tamaño es el conjunto. */}
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <TarjetaKpi
            rotulo="Clientes activos"
            valor={num(activos)}
            pie={
              clientes.length > activos
                ? `${clientes.length - activos} inactivo${clientes.length - activos === 1 ? '' : 's'}`
                : 'ninguno dado de baja'
            }
          />
          <TarjetaKpi
            rotulo="Comprado entre todos"
            valor={dec(m3)}
            unidad="m³"
            pie={mayor ? `${mayor.nombre} es el que más lleva` : 'sin cargas asignadas'}
          />
          <TarjetaKpi rotulo="Facturado" valor={$(facturado)} pie="de las cargas asignadas" />
        </section>

        <ListaClientes sembrados={clientes} />
      </main>
    </>
  );
}
