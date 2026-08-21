import { clientesAsignables, traerInicio, type Rango } from '@/lib/datos/inicio';
import { ResumenInicio } from '@/components/app/resumen-inicio';

/**
 * Apartado 1 — Inicio.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-1-inicio.md
 *
 * Una sola regla la gobierna: si no es de hoy o no requiere acción, no va acá.
 *
 * ⚠️ La spec dice móvil primero (R5). Se está construyendo **escritorio
 * primero** por decisión de Lau (20/08): primero toda la web en escritorio,
 * después la pasada de móvil.
 *
 * Acá sólo queda el fetch. Todo lo que se ve vive en `ResumenInicio`, que
 * es un componente cliente porque tiene que aplicarle a las cargas las
 * asignaciones que todavía viven en `localStorage`. El motivo largo está
 * escrito en ese archivo.
 */

export const dynamic = 'force-dynamic';

const RANGOS_VALIDOS: Rango[] = ['hoy', 'semana', 'mes'];

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: crudo } = await searchParams;
  const rango = RANGOS_VALIDOS.includes(crudo as Rango) ? (crudo as Rango) : 'hoy';

  return <ResumenInicio datos={await traerInicio(rango)} clientes={clientesAsignables()} />;
}
