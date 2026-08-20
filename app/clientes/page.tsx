import { BarraSuperior } from '@/components/app/barra-superior';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { ListaClientes } from '@/components/clientes/lista-clientes';
import { traerClientes } from '@/lib/datos/clientes';

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

  return (
    <>
      <BarraSuperior />

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
        <EncabezadoPagina
          titulo="Clientes"
          bajada={
            <>
              {activos} {activos === 1 ? 'activo' : 'activos'} de {clientes.length}.
              Los m³ y lo facturado salen de las cargas que tienen asignadas.
            </>
          }
        />

        <ListaClientes sembrados={clientes} />
      </main>
    </>
  );
}
