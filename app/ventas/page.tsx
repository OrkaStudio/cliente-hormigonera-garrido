import { PanelVentas } from '@/components/ventas/panel';
import { traerVentas } from '@/lib/datos/ventas';

/**
 * Apartados 2 y 3 — Cargas y Ventas, en una sola pantalla.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-2-cargas.md  (el tronco: qué produjo el PLC)
 *       2026-08-18-apartado-3-ventas-documentos.md  (a quién y por cuánto)
 *
 * La spec del apartado 2 ya lo decía en su primera línea —"una carga es
 * una venta"— pero estaban construidos como dos pantallas que listaban
 * las mismas filas → decisiones/hormigonera-la-venta-es-el-dia
 */

// El corte blanco/negro se deriva del momento de la consulta.
export const dynamic = 'force-dynamic';

export default async function Ventas() {
  return <PanelVentas datos={await traerVentas()} />;
}
