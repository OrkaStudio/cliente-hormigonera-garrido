import {
  type ClienteConResumen,
  resumenDeCliente,
  ordenarPorActividad,
  ventasDe,
} from '@/lib/dominio/clientes';
import { CLIENTES, generarCargas } from './semilla';

/**
 * Las consultas de Clientes.
 *
 * Mismo trato que `traerInicio()`: hoy leen de la semilla, son async a
 * propósito, y el día que exista el proyecto de Supabase se les cambia
 * el cuerpo sin tocar una línea de las pantallas.
 *
 * El resumen se calcula acá y no en la vista porque en Supabase va a
 * ser una vista o un `group by` — no cinco `reduce` adentro de un JSX.
 */

export async function traerClientes(ahora = new Date()): Promise<ClienteConResumen[]> {
  const cargas = generarCargas(ahora);

  return ordenarPorActividad(
    CLIENTES.map((c) => ({ ...c, resumen: resumenDeCliente(c.id, cargas) })),
  );
}

export interface PerfilCliente extends ClienteConResumen {
  /** Sus ventas, de la más reciente a la más vieja. */
  ventas: ReturnType<typeof ventasDe>;
}

export async function traerPerfilCliente(
  id: string,
  ahora = new Date(),
): Promise<PerfilCliente | null> {
  const cliente = CLIENTES.find((c) => c.id === id);
  if (!cliente) return null;

  const cargas = generarCargas(ahora);
  const ventas = ventasDe(id, cargas).sort((a, b) => b.momento.localeCompare(a.momento));

  return { ...cliente, resumen: resumenDeCliente(id, cargas), ventas };
}
