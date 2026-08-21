import { PanelCargas } from '@/components/cargas/panel';
import { traerCargas } from '@/lib/datos/cargas';

export const dynamic = 'force-dynamic';

export default async function Cargas() {
  const datos = await traerCargas();
  return <PanelCargas datos={datos} />;
}
