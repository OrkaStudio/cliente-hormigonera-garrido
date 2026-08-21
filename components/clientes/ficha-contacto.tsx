'use client';

import { Building2, IdCard, Mail, MapPin, MessageCircle, Phone, User } from 'lucide-react';

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
}: {
  icono: typeof Phone;
  rotulo: string;
  valor: string | null;
  mono?: boolean;
  href?: string | null;
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
      </span>
    </>
  );

  if (valor && href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="hover:bg-sunk -mx-2 flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors"
      >
        {contenido}
      </a>
    );
  }

  return <div className="-mx-2 flex items-start gap-2.5 px-2 py-1.5">{contenido}</div>;
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
    <div className="grid gap-4">
      <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
        <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
          Contacto
        </h3>

        <div className="mt-2 grid">
          <Fila icono={User} rotulo="Con quién se habla" valor={contacto} />
          <Fila
            icono={wsp ? MessageCircle : Phone}
            rotulo={wsp ? 'Teléfono · WhatsApp' : 'Teléfono'}
            valor={telefono}
            mono
            href={wsp ? `https://wa.me/${wsp}` : null}
          />
          <Fila icono={Mail} rotulo="Mail" valor={mail} href={mail ? `mailto:${mail}` : null} />
        </div>

        {vacio && onEditar && (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onEditar}>
            Cargar los datos
          </Button>
        )}
      </div>

      <div className="border-line bg-card shadow-tarjeta rounded-lg border p-4">
        <h3 className="rotulo-obra text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
          Para los papeles
        </h3>

        <div className="mt-2 grid">
          <Fila icono={IdCard} rotulo="CUIT" valor={cuit} mono />
          <Fila icono={Building2} rotulo="Domicilio fiscal" valor={direccion} />
        </div>

        <p className="text-faint mt-2 flex items-start gap-1.5 text-xs">
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
          El lugar de entrega se carga en cada remito: casi nunca es este domicilio.
        </p>
      </div>

      {notas && (
        <div className="border-line bg-sunk rounded-lg border border-dashed p-4">
          <h3 className="text-faint text-[11px] font-semibold tracking-[0.08em] uppercase">
            Notas
          </h3>
          <p className="text-ink-soft mt-1.5 text-sm whitespace-pre-line">{notas}</p>
        </div>
      )}
    </div>
  );
}
