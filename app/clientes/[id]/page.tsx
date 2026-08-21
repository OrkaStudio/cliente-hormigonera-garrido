import { BarraSuperior } from '@/components/app/barra-superior';
import { PerfilCliente } from '@/components/clientes/perfil-cliente';
import { traerPerfilCliente } from '@/lib/datos/clientes';

/**
 * Apartado 4 — el perfil de un cliente.
 *
 * No hace notFound() cuando la consulta vuelve vacía: mientras no haya
 * base de datos, un cliente puede existir sólo en el navegador de quien
 * lo cargó. El componente lo busca ahí antes de decir que no existe.
 */
export const dynamic = 'force-dynamic';

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await traerPerfilCliente(id);

  return (
    <>
      <BarraSuperior activo="Clientes" />
      <PerfilCliente perfil={perfil} id={id} />
    </>
  );
}
