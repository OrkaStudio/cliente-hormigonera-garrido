import { ROTULO, totalDe, type Documento } from './documentos';
import { $, dec } from '@/lib/formato';

/**
 * Mandar el documento por WhatsApp.
 *
 * ⚠️ Lo que NO se puede, y conviene tener escrito para que nadie lo
 * vuelva a prometer: **desde el navegador no se adjunta un PDF**. El
 * enlace `wa.me` sólo acepta el parámetro `text`; no existe uno para
 * archivos. Adjuntar de verdad requiere la WhatsApp Business Platform de
 * Meta — cuenta verificada, plantillas aprobadas y costo por
 * conversación — más un backend que genere y hostee el PDF.
 *
 * Así que va el mensaje armado y el enlace al documento. El cliente lo
 * abre y ahí tiene el papel para ver, imprimir o guardar como PDF.
 */

/**
 * Deja el teléfono como lo quiere wa.me.
 *
 * En Argentina esto tiene dos trampas que rompen el enlace en silencio:
 *
 *  1. **El 9.** WhatsApp pide `549` + área + abonado. Sin ese 9 el enlace
 *     abre la aplicación y dice que el número no existe.
 *  2. **El 15.** Los móviles se escriben con un 15 delante del abonado
 *     cuando se los llama desde una línea local ("2241 15-63-4402"), pero
 *     ese 15 NO va en el formato internacional.
 *
 * Se aceptan las mil formas en que la gente los carga: con o sin país,
 * con 0 adelante, con guiones, con paréntesis.
 *
 * Devuelve null cuando lo cargado no puede ser un teléfono argentino —
 * mejor no ofrecer el botón que ofrecer uno que no va a encontrar a nadie.
 */
export function telefonoParaWhatsapp(crudo: string | null): string | null {
  if (!crudo) return null;

  let d = crudo.replace(/\D/g, '');
  if (!d) return null;

  // Sacar prefijos internacionales y de discado en el orden en que llegan.
  d = d.replace(/^00/, '');
  if (d.startsWith('54')) d = d.slice(2);
  d = d.replace(/^0/, '');
  if (d.length === 11 && d.startsWith('9')) d = d.slice(1);

  // El 15 del móvil viene después del área, que mide entre 2 y 4 dígitos.
  // Sin él, área + abonado siempre suman 10.
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === '15') {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }

  if (d.length !== 10) return null;
  return `549${d}`;
}

/** El primer nombre, para que el saludo no suene a carta de banco. */
function saludo(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '').trim();
  if (!limpio) return 'Hola';
  return `Hola ${limpio.split(/\s+/)[0]}`;
}

export function mensajeDeDocumento(doc: Documento, url: string, contacto?: string | null) {
  const total = totalDe(doc);
  const linea = doc.lineas[0];

  const que = linea
    ? `${dec(linea.cantidad)} ${linea.unidad} de ${linea.detalle.replace(/^Hormigón elaborado /i, '')}`
    : null;

  const partes = [
    `${saludo(contacto)}, te paso el ${ROTULO[doc.tipo].toLowerCase()} ${doc.numero}`,
    que ? ` por ${que}` : '',
    doc.obra ? ` para ${doc.obra}` : '',
    '.',
    total !== null ? ` Total ${$(total)}.` : '',
    doc.validoHasta ? ' El precio vale por los días indicados en el papel.' : '',
    `\n\n${url}`,
    '\n\nCualquier cosa me escribís. Gracias!',
  ];

  return partes.join('');
}

export function enlaceWhatsapp(telefono: string, mensaje: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}
