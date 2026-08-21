'use client';

import { useEffect, useState } from 'react';

import { EmisorDocumento } from '@/components/documentos/emisor';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { buscarLocal, parcheLocal } from '@/lib/datos/locales';
import type { PerfilCliente } from '@/lib/datos/clientes';
import type { Cliente } from '@/lib/datos/tipos';
import type { TipoDocumento } from '@/lib/dominio/documentos';

/**
 * Resuelve el cliente antes de armar el documento.
 *
 * Existe por la misma razón que el mismo baile en `perfil-cliente`:
 * mientras no haya base, un cliente puede existir sólo en el navegador
 * de quien lo dio de alta, y los datos que van impresos en el papel
 * (CUIT, dirección) pueden estar parcheados ahí.
 *
 * Un remito con la dirección vieja del cliente es un camión en la
 * puerta equivocada, así que esto no se saltea.
 */
export function EmisorConDatos({
  id,
  perfil,
  cargaId,
  tipo,
}: {
  id: string;
  perfil: PerfilCliente | null;
  cargaId: string | null;
  tipo: TipoDocumento;
}) {
  const [cliente, setCliente] = useState<Cliente | null>(perfil);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    setCliente(perfil ? { ...perfil, ...parcheLocal(id) } : buscarLocal(id));
  }, [perfil, id]);

  if (!cliente) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EstadoVacio
          titulo={montado ? 'Este cliente no existe' : 'Buscando…'}
          descripcion={
            montado
              ? 'No lo encontramos ni en la planta ni en este navegador.'
              : 'Un segundo.'
          }
        />
      </main>
    );
  }

  const carga = perfil?.ventas.find((v) => v.id === cargaId) ?? null;

  return <EmisorDocumento cliente={cliente} carga={carga} tipoInicial={tipo} />;
}
