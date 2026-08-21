import { PanelRentabilidad } from '@/components/rentabilidad/panel';
import { traerRentabilidad, type Rango } from '@/lib/datos/rentabilidad';

export const dynamic = 'force-dynamic';

const RANGOS: Rango[] = ['mes', 'trimestre'];

export default async function Rentabilidad({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: crudo } = await searchParams;
  const rango = RANGOS.includes(crudo as Rango) ? (crudo as Rango) : 'mes';
  const datos = await traerRentabilidad(rango);

  return <PanelRentabilidad datos={datos} />;
}
