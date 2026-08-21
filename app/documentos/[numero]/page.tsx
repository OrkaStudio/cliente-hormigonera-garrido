import { VistaDocumento } from '@/components/documentos/vista-documento';

/**
 * Un documento emitido, listo para imprimir.
 *
 * La ruta es por número y no por id de carga porque un cliente puede
 * pedir "mandame de nuevo el 0001-00000042" — el número es lo que se
 * dice por teléfono.
 *
 * Es dinámica y sin datos del servidor: mientras no haya Supabase, los
 * documentos viven en el navegador que los emitió. Eso está escrito en
 * `lib/datos/documentos-locales.ts`, con la advertencia que corresponde.
 */
export default async function Documento({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  return <VistaDocumento numero={numero} />;
}
