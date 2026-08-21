'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

import { HojaDocumento } from '@/components/documentos/hoja';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { Button } from '@/components/ui/button';
import { buscarDocumento } from '@/lib/datos/documentos-locales';
import type { Documento } from '@/lib/dominio/documentos';

/**
 * La pantalla de un documento emitido.
 *
 * Todo lo que no es el papel lleva `data-imprimir="no"`: al imprimir
 * desaparece y queda la hoja sola. Ver `@media print` en globals.css.
 */
export function VistaDocumento({ numero }: { numero: string }) {
  const [doc, setDoc] = useState<Documento | null>(null);
  const [buscado, setBuscado] = useState(false);

  // localStorage no existe en el servidor: se lee despues de montar o la
  // hidratacion no coincide con el HTML.
  useEffect(() => {
    setDoc(buscarDocumento(numero));
    setBuscado(true);
  }, [numero]);

  if (!buscado) return null;

  if (!doc) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EstadoVacio
          titulo="No encontramos ese documento"
          descripcion="Los documentos todavía se guardan en el navegador donde se emitieron. Si lo emitiste en otra computadora, o borraste los datos del sitio, no está acá."
        />
        <div className="mt-6 flex justify-center">
          <Button nativeButton={false} variant="outline" render={<Link href="/clientes" />}>
            Volver a Clientes
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div
        data-imprimir="no"
        className="border-line bg-panel/80 sticky top-0 z-10 border-b backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href={`/clientes/${doc.clienteId}`}
            className="text-faint hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-3.5" />
            {doc.clienteNombre}
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-faint hidden text-xs sm:inline">
              Ctrl+P y elegí “Guardar como PDF”
            </span>
            <Button onClick={() => window.print()}>
              <Printer data-icon="inline-start" />
              Imprimir o guardar PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="py-8 print:py-0">
        <div className="border-line bg-paper shadow-tarjeta mx-auto max-w-3xl rounded-xl border print:rounded-none print:border-0 print:shadow-none">
          <HojaDocumento doc={doc} />
        </div>
      </main>
    </>
  );
}
