'use client';

import { Building2, IdCard, Mail, MessageCircle, Phone, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { telefonoParaWhatsapp } from '@/lib/dominio/whatsapp';
import { cn } from '@/lib/utils';

/**
 * Con quién se habla y a quién se le factura.
 *
 * Eran cuatro filas iguales bajo el rótulo "Datos": dirección, CUIT, mail
 * y teléfono, todo con el mismo peso. Pero no son lo mismo — el teléfono
 * de Marcelo sirve para llamarlo ahora y el CUIT sólo aparece cuando hay
 * que armar un papel. Van separados, y lo que se puede accionar se ve
 * accionable: el teléfono abre WhatsApp, el mail abre el correo.
 */

function Fila({
  icono: Icono,
  rotulo,
  valor,
  mono = false,
  href,
  nota,
}: {
  icono: typeof Phone;
  rotulo: string;
  valor: string | null;
  mono?: boolean;
  href?: string | null;
  /** La aclaración que cuelga del dato, no de la tarjeta. */
  nota?: string;
}) {
  const contenido = (
    <>
      <Icono
        className={cn('mt-0.5 size-3.5 shrink-0', valor ? 'text-faint' : 'text-line-strong')}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="text-faint block text-[11px] tracking-wide uppercase">{rotulo}</span>
        <span
          className={cn(
            'block break-all',
            mono && valor ? 'font-mono text-sm tabular-nums' : 'text-sm',
            valor ? 'text-ink' : 'text-faint italic',
          )}
          title={valor ?? undefined}
        >
          {valor ?? 'sin cargar'}
        </span>
        {nota && <span className="text-faint mt-1 block text-xs italic">{nota}</span>}
      </span>
    </>
  );

  if (valor && href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="hover:bg-sunk -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2.5 transition-colors"
      >
        {contenido}
      </a>
    );
  }

  return <div className="-mx-2 flex items-start gap-2.5 px-2 py-2.5">{contenido}</div>;
}

export interface FichaContactoProps {
  contacto: string | null;
  telefono: string | null;
  mail: string | null;
  cuit: string | null;
  direccion: string | null;
  notas: string | null;
  /** Mostrador: no es una persona, así que no hay a quién llamar. */
  generico?: boolean;
  onEditar?: () => void;
}

export function FichaContacto({
  contacto,
  telefono,
  mail,
  cuit,
  direccion,
  notas,
  generico = false,
  onEditar,
}: FichaContactoProps) {
  const wsp = telefonoParaWhatsapp(telefono);
  const vacio = !contacto && !telefono && !mail && !cuit && !direccion;

  if (generico) {
    return (
      <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
        <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
          Sin ficha
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Mostrador es una boca de venta, no una persona: no tiene teléfono ni CUIT porque
          detrás hay muchos compradores distintos.
        </p>
      </div>
    );
  }

  return (
    <div className="border-line bg-card shadow-tarjeta flex flex-col gap-4 rounded-lg border p-4">
      <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
        Contacto oficial
      </h3>

      {/* Un solo bloque, separado por líneas. Eran dos tarjetas —"Contacto"
          y "Para los papeles"— y con la columna angosta quedaban dos cajas
          flacas una arriba de la otra diciendo lo mismo: quién es este
          cliente. */}
      <div className="divide-line grid divide-y">
        <Fila icono={User} rotulo="Contacto principal" valor={contacto} />
        <Fila
          icono={wsp ? MessageCircle : Phone}
          rotulo={wsp ? 'Teléfono · WhatsApp' : 'Teléfono'}
          valor={telefono}
          mono
          href={wsp ? `https://wa.me/${wsp}` : null}
        />
        <Fila icono={Mail} rotulo="Mail" valor={mail} href={mail ? `mailto:${mail}` : null} />
        <Fila
          icono={Building2}
          rotulo="Domicilio fiscal"
          valor={direccion}
          nota="El lugar de entrega se carga en cada remito: casi nunca es este domicilio."
        />
        <Fila icono={IdCard} rotulo="CUIT" valor={cuit} mono />
      </div>

      {vacio && onEditar && (
        <Button variant="outline" size="sm" onClick={onEditar}>
          Cargar los datos
        </Button>
      )}

      {notas && (
        <div className="border-line bg-sunk rounded-md border border-dashed p-3">
          <h4 className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
            Notas
          </h4>
          <p className="text-ink-soft mt-1.5 text-sm whitespace-pre-line">{notas}</p>
        </div>
      )}
    </div>
  );
}
