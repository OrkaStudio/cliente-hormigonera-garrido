'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

import { documentosDe } from '@/lib/datos/documentos-locales';
import { ROTULO, totalDe, type Documento } from '@/lib/dominio/documentos';
import { $, fechaDeMomento, hora } from '@/lib/formato';

/**
 * Los papeles que ya se le emitieron a este cliente.
 *
 * Existe porque hasta ahora un documento emitido no tenía camino de
 * vuelta: se llegaba una sola vez, justo después de emitirlo, y si se
 * cerraba la pestaña había que acordarse del número. Acá es donde José lo
 * va a buscar cuando el cliente llame pidiendo "el remito del jueves" —
 * y desde adentro se lo puede volver a mandar por WhatsApp o imprimir.
 */
export function DocumentosDelCliente({ clienteId }: { clienteId: string }) {
  const [docs, setDocs] = useState<Documento[] | null>(null);

  // Viven en localStorage: no existen en el servidor.
  useEffect(() => {
    setDocs(documentosDe(clienteId));
  }, [clienteId]);

  if (!docs || docs.length === 0) return null;

  return (
    <section>
      <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
        Papeles emitidos
      </h2>

      <ul className="border-line bg-panel shadow-tarjeta mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border">
        {docs.map((d) => {
          const total = totalDe(d);
          return (
            <li key={d.numero}>
              <Link
                href={`/documentos/${d.numero}` as Route}
                className="hover:bg-sunk flex items-center gap-3 p-3 transition-colors"
              >
                <FileText className="text-faint size-4 shrink-0" aria-hidden />

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{ROTULO[d.tipo]}</span>
                  <span className="text-faint font-mono text-xs tabular-nums">
                    {d.numero}
                  </span>
                </span>

                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {fechaDeMomento(d.emitido)} {hora(d.emitido)}
                </span>

                <span className="w-28 text-right text-sm tabular-nums">
                  {total === null ? (
                    <span className="text-faint">sin valores</span>
                  ) : (
                    $(total)
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
