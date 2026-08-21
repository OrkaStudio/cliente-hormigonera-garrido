/**
 * Los papeles que salen de la plataforma.
 *
 * Ninguno es fiscal. Ver `LEYENDA_NO_FISCAL` en config/empresa.ts y
 * decisiones/hormigonera-plataforma-sin-fiscal.
 */

export type TipoDocumento = 'presupuesto' | 'remito' | 'remito-sin-valores';

export const ROTULO: Record<TipoDocumento, string> = {
  presupuesto: 'Presupuesto',
  remito: 'Remito',
  'remito-sin-valores': 'Remito de entrega',
};

export interface LineaDocumento {
  /** "H-21", "Flete", "Bombeo". Texto libre para que entre lo que haga falta. */
  detalle: string;
  cantidad: number;
  unidad: string;
  /** Null en el remito sin valores: ahi no hay precio en ninguna parte. */
  precioUnitario: number | null;
}

export interface Documento {
  /** 0001-00000042. Ver `formatearNumero`. */
  numero: string;
  tipo: TipoDocumento;
  /** ISO. Cuando se emitio, no cuando se imprime. */
  emitido: string;
  clienteId: string;
  clienteNombre: string;
  clienteCuit: string | null;
  clienteDireccion: string | null;
  lineas: LineaDocumento[];
  /**
   * Hasta cuando vale el precio. Solo en presupuestos, y NO es opcional
   * ahi: con esta inflacion un presupuesto sin vencimiento es una
   * promesa que no se puede cumplir tres semanas despues.
   */
  validoHasta?: string;
  /** De que carga salio, cuando salio de una. Para poder rastrearlo. */
  cargaId?: string;
  notas?: string;
}

/** El total del documento. Null cuando no lleva valores. */
export function totalDe(doc: Pick<Documento, 'lineas'>): number | null {
  if (doc.lineas.every((l) => l.precioUnitario === null)) return null;
  return doc.lineas.reduce((a, l) => a + l.cantidad * (l.precioUnitario ?? 0), 0);
}

/**
 * 0001-00000042 — punto de venta y correlativo, como se lee en cualquier
 * comprobante del pais.
 *
 * El formato imita al de un comprobante real a proposito: es lo que Jose
 * y sus clientes saben leer por telefono. Lo que NO imita es su
 * autoridad, y por eso la leyenda de "no es factura fiscal" va impresa
 * en la misma hoja, no escondida al pie.
 */
export function formatearNumero(puntoDeVenta: number, correlativo: number): string {
  return `${String(puntoDeVenta).padStart(4, '0')}-${String(correlativo).padStart(8, '0')}`;
}

/** El correlativo de un numero ya formateado. Para saber por cual seguir. */
export function correlativoDe(numero: string): number {
  const n = Number(numero.split('-')[1]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Si este documento puede llevar precios.
 *
 * El remito sin valores es el que va con el chofer en el mixer: dice que
 * se entrego y nada mas. Que el precio no llegue a la obra es
 * deliberado, no un olvido.
 */
export function llevaValores(tipo: TipoDocumento): boolean {
  return tipo !== 'remito-sin-valores';
}
