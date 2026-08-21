import { BarraSuperior } from '@/components/app/barra-superior';
import { EmisorConDatos } from '@/components/documentos/emisor-con-datos';
import { traerPerfilCliente } from '@/lib/datos/clientes';
import type { TipoDocumento } from '@/lib/dominio/documentos';

/**
 * Armar un documento para un cliente.
 *
 * Es una pantalla y no un diálogo porque el papel se ve mientras se
 * arma: al lado de una hoja A4 en vista previa, un modal queda chico.
 *
 * `carga` llega por query: un remito sale de una carga concreta, un
 * presupuesto de ninguna. Así la URL se puede compartir y volver a
 * abrir tal cual.
 */
export const dynamic = 'force-dynamic';

const TIPOS: TipoDocumento[] = ['presupuesto', 'remito', 'remito-sin-valores'];

export default async function Emitir({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; carga?: string }>;
}) {
  const { id } = await params;
  const { tipo: crudo, carga } = await searchParams;
  const tipo = TIPOS.includes(crudo as TipoDocumento) ? (crudo as TipoDocumento) : 'presupuesto';

  return (
    <>
      <BarraSuperior activo="Clientes" />
      <EmisorConDatos
        id={id}
        perfil={await traerPerfilCliente(id)}
        cargaId={carga ?? null}
        tipo={tipo}
      />
    </>
  );
}
