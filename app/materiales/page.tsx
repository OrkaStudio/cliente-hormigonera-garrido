import { PanelMateriales } from '@/components/materiales/panel';
import { traerMateriales } from '@/lib/datos/materiales';

export const dynamic = 'force-dynamic';

export default async function Materiales() {
  const datos = await traerMateriales();
  return <PanelMateriales datos={datos} />;
}
