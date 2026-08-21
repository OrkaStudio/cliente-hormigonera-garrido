import { EMPRESA, LEYENDA_NO_FISCAL } from '@/config/empresa';
import { ROTULO, totalDe, type Documento } from '@/lib/dominio/documentos';
import { $, dec, fechaDeDocumento } from '@/lib/formato';

/**
 * El papel. Lo que Jose le manda al cliente.
 *
 * Se imprime desde el navegador (Ctrl+P → Guardar como PDF) en vez de
 * generarse con una libreria: no suma 400 kB al bundle, no necesita un
 * Chromium en el servidor, y lo que se ve en pantalla es exactamente lo
 * que sale impreso. Las reglas de impresion viven en `globals.css`, bajo
 * `@media print`.
 *
 * Tres cosas que no se negocian en esta hoja:
 *
 *  1. La leyenda de "no es factura fiscal" va ARRIBA y visible, no
 *     escondida al pie en cuerpo 6. Si alguien la confunde con una
 *     factura, el problema es de Jose, no del que la leyo mal.
 *  2. El remito sin valores no muestra precios EN NINGUNA PARTE. Es el
 *     que va con el chofer: que el precio no llegue a la obra es
 *     deliberado.
 *  3. No hay IVA, ni neto, ni discriminacion de impuestos. La
 *     plataforma no calcula nada fiscal.
 */
export function HojaDocumento({ doc }: { doc: Documento }) {
  const total = totalDe(doc);
  const conValores = total !== null;

  return (
    <article className="hoja bg-paper text-ink mx-auto max-w-3xl p-10 print:max-w-none print:p-0">
      <header className="border-line flex flex-wrap items-start justify-between gap-6 border-b pb-5">
        <div>
          <p className="text-marca font-heading text-xl font-black tracking-tight">
            {EMPRESA.marca}
          </p>
          <p className="text-ink-soft mt-1 text-sm">{EMPRESA.planta}</p>
          <p className="text-faint text-sm">{EMPRESA.localidad}</p>
          {EMPRESA.cuit && <p className="text-faint mt-1 font-mono text-xs">CUIT {EMPRESA.cuit}</p>}
        </div>

        <div className="text-right">
          <p className="font-heading text-lg font-semibold">{ROTULO[doc.tipo]}</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums">N° {doc.numero}</p>
          <p className="text-faint mt-1 text-sm first-letter:uppercase">
            {fechaDeDocumento(doc.emitido)}
          </p>
        </div>
      </header>

      {/* Arriba y con borde: nadie tiene que buscarla. */}
      <p className="border-line-strong text-ink-soft mt-4 rounded-md border border-dashed px-3 py-2 text-xs">
        {LEYENDA_NO_FISCAL}
      </p>

      <section className="mt-6 flex flex-wrap justify-between gap-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Cliente
          </p>
          <p className="mt-1 font-medium">{doc.clienteNombre}</p>
          {doc.clienteDireccion && <p className="text-ink-soft text-sm">{doc.clienteDireccion}</p>}
          {doc.clienteCuit && (
            <p className="text-faint font-mono text-sm tabular-nums">CUIT {doc.clienteCuit}</p>
          )}
        </div>

        {/* La obra va al lado del cliente y no al pie: es lo primero que
            mira el chofer cuando le dan el papel. */}
        {(doc.obra || doc.distanciaKm) && (
          <div className="text-right">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Entrega
            </p>
            {doc.obra && <p className="mt-1 font-medium">{doc.obra}</p>}
            {doc.distanciaKm ? (
              <p className="text-ink-soft font-mono text-sm tabular-nums">
                a {dec(doc.distanciaKm)} km de planta
              </p>
            ) : null}
          </div>
        )}
      </section>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-line-strong border-b text-left">
            <th className="py-2 font-medium">Detalle</th>
            <th className="w-24 py-2 text-right font-medium">Cantidad</th>
            {conValores && (
              <>
                <th className="w-32 py-2 text-right font-medium">Precio unit.</th>
                <th className="w-32 py-2 text-right font-medium">Importe</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {doc.lineas.map((l, i) => (
            <tr key={i} className="border-line border-b">
              <td className="py-2">{l.detalle}</td>
              <td className="py-2 text-right font-mono tabular-nums">
                {dec(l.cantidad)} {l.unidad}
              </td>
              {conValores && (
                <>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {l.precioUnitario === null ? '—' : $(l.precioUnitario)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {l.precioUnitario === null ? '—' : $(l.cantidad * l.precioUnitario)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        {conValores && (
          <tfoot>
            <tr>
              <td colSpan={3} className="py-3 text-right font-medium">
                Total
              </td>
              <td className="py-3 text-right font-mono text-base font-semibold tabular-nums">
                {$(total)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {doc.validoHasta && (
        <p className="text-warn-text border-warn/30 bg-warn-soft mt-4 rounded-md border px-3 py-2 text-sm">
          Este presupuesto vale hasta el {fechaDeDocumento(doc.validoHasta)}. Pasada esa
          fecha hay que pedir precio de nuevo.
        </p>
      )}

      {doc.notas && <p className="text-ink-soft mt-4 text-sm whitespace-pre-line">{doc.notas}</p>}

      <footer className="border-line text-faint mt-10 flex flex-wrap justify-between gap-4 border-t pt-4 text-xs">
        <span>
          {EMPRESA.nombre} · {EMPRESA.planta}
        </span>
        {doc.cargaId && <span className="font-mono">Carga {doc.cargaId}</span>}
      </footer>

      {/* Solo para el remito que va con el chofer. Un remito sin firma no
          prueba que se entrego. */}
      {doc.tipo === 'remito-sin-valores' && (
        <div className="mt-12 flex justify-between gap-10 text-xs">
          <div className="border-line-strong flex-1 border-t pt-1.5">Recibí conforme</div>
          <div className="border-line-strong flex-1 border-t pt-1.5">Aclaración y DNI</div>
        </div>
      )}
    </article>
  );
}
