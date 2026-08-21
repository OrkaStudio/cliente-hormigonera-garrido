/**
 * Los datos de la planta, en un solo lugar.
 *
 * Existe porque ahora salen impresos en un papel que se le da al
 * cliente. Un CUIT mal escrito en la barra superior es un detalle; el
 * mismo CUIT mal escrito en cien remitos es otra cosa.
 *
 * ⚠️ PENDIENTE DE CONFIRMAR CON JOSE. El nombre y la direccion salen de
 * lo que ya estaba en la maqueta; el CUIT y el telefono todavia no los
 * tenemos. Hasta que los confirme, el documento no los imprime — es
 * preferible un remito sin CUIT que un remito con un CUIT inventado.
 */
export const EMPRESA = {
  nombre: 'Hormimonte',
  /** Como se lo ve en el logo, en versalitas. */
  marca: 'HORMIMONTE',
  planta: 'Planta Monte · Ruta 3 y 41',
  localidad: 'San Miguel del Monte, Buenos Aires',
  cuit: null as string | null,
  telefono: null as string | null,
  mail: null as string | null,
} as const;

/**
 * La leyenda que va impresa en TODO documento que salga de acá.
 *
 * No es decorativa y no se saca: la plataforma no emite factura legal,
 * no pide CAE, no se conecta con ARCA y no calcula IVA. Si el papel no
 * lo dice, alguien lo va a confundir con una factura.
 * Ver decisiones/hormigonera-plataforma-sin-fiscal.
 */
export const LEYENDA_NO_FISCAL =
  'Comprobante comercial. No es una factura fiscal: no reemplaza la documentación exigida por ARCA.';
