import { PanelVentas } from '@/components/ventas/panel';
import { traerVentas } from '@/lib/datos/ventas';

/**
 * Apartado 3 — Ventas y documentos.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-3-ventas-documentos.md
 *
 * Era el único de los seis apartados del menú sin ruta: el item estaba
 * muerto y los papeles vivían adentro del perfil de cada cliente. Esta es
 * la vista transversal.
 */

// El corte blanco/negro se deriva del momento de la consulta.
export const dynamic = 'force-dynamic';

export default async function Ventas() {
  return <PanelVentas datos={await traerVentas()} />;
}
