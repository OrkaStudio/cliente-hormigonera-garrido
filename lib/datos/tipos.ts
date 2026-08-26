/**
 * Las formas del dominio.
 *
 * Salen de las especificaciones (`orka-brain/clientes/hormigonera-jose/
 * especificaciones/`), no de las maquetas. Cuando exista el proyecto de
 * Supabase, estos tipos los va a generar `generate_typescript_types` y
 * este archivo se reemplaza — por eso los nombres son los de la tabla
 * que viene, no los de la pantalla.
 */

export type EstadoCarga = 'registrada' | 'asignada' | 'facturada' | 'anulada';

/**
 * De que lado cae una venta. `parcial` existe porque en la practica se
 * factura una parte y el resto no: un booleano no puede representar
 * "de $564.000 se facturaron $350.000".
 *
 * No se guarda. Se deriva del monto con `condicionFiscal()`.
 */
export type Fiscal = 'blanco' | 'negro' | 'parcial';

export interface PesadaMaterial {
  material: string;
  /** Lo que dice la receta declarada en la app. */
  receta: number;
  /** Lo que el PLC pidió dosificar en esta carga. */
  objetivo: number;
  /** Lo que la balanza efectivamente pesó. */
  real: number;
}

export interface Carga {
  id: string;
  /** Momento en que el PLC cerró el ciclo. */
  momento: string;
  receta: string;
  m3: number;
  /** Null mientras la carga está pendiente de asignación. */
  clienteId: string | null;
  estado: EstadoCarga;
  /**
   * El precio por m3 que se le cobro a ESE cliente en ESE momento.
   *
   * Se congela en la venta (R2 del apartado 8). Sin esto, cambiar la
   * lista de precios hoy reescribiria el margen del mes pasado y el
   * historial dejaria de significar algo.
   */
  precioM3?: number | null;
  /**
   * A cuantos kilometros de la planta se entrego.
   *
   * Ya se anota en el remito porque al chofer le sirve saber el viaje.
   * Anotarlo en la venta es lo que permite calcular cuanto gasoil costo
   * llevarla — y con eso, hasta donde conviene ir.
   */
  distanciaKm?: number | null;
  /**
   * Cuanto de esta venta se facturo, EN PESOS.
   *
   * Se guarda el monto y no el porcentaje a proposito. El porcentaje se
   * recalcula solo si el total cambia, y con esta inflacion un historico
   * que se mueve hace mentir a la rentabilidad entera — la misma razon
   * por la que el precio se congela en la venta.
   *
   *   null            todavia no se definio
   *   0               nada facturado (negro)
   *   igual a `total` todo facturado (blanco)
   *   en el medio     parcial
   */
  montoFacturado: number | null;
  total: number;
  pesadas: PesadaMaterial[];
  /** Valores fuera de rango razonable: se marca, no se rechaza. */
  sospechosa?: boolean;
  /**
   * A qué pedido se imputó este pastón.
   *
   * El pedido es la unidad comercial y el pastón la técnica: 18 m³ para
   * un cliente son UN pedido y tres pastones. Sin esto, la app muestra
   * tres ventas y hay que tipearle el precio a cada una.
   *
   * Null mientras nadie lo imputó → decisiones/hormigonera-el-pedido-es-la-venta.
   */
  pedidoId?: string | null;
}

/** Un pedido abierto todavía espera producción; uno completo ya salió entero. */
export type EstadoPedido = 'abierto' | 'completo' | 'cancelado';

/**
 * Lo que un cliente encargó.
 *
 * Es la unidad COMERCIAL: lo que se acordó por teléfono, con su precio y
 * su destino. Los pastones que el autómata larga se le imputan encima.
 *
 * Nace antes que la producción, no después: por eso tiene `m3` (lo
 * pedido) y no un total — el total sale de los pastones que efectivamente
 * salieron.
 */
export interface Pedido {
  /** P-0042. Numeración propia, correlativa. */
  id: string;
  clienteId: string;
  receta: string;
  /** Cuánto encargó. Lo producido puede ser menos, o un poco más. */
  m3: number;
  /**
   * El precio acordado, congelado.
   *
   * Se pacta UNA vez al tomar el pedido y se aplica a todos sus pastones.
   * Antes había que tipearlo en cada uno — treinta y nueve veces por mes,
   * y cada tipeo una oportunidad de equivocarse.
   */
  precioM3: number;
  /** Cuándo se tomó el pedido. */
  creado: string;
  /**
   * Adónde va el hormigón. Suele NO ser el domicilio fiscal del cliente:
   * un corralón factura en su local y recibe en la obra.
   */
  obra?: string | null;
  /** Para cuándo lo quiere. Null si no se acordó fecha. */
  paraCuando?: string | null;
  estado: EstadoPedido;
  notas?: string | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  mail: string | null;
  /** Para el encabezado del documento. */
  direccion: string | null;
  cuit: string | null;
  notas: string | null;
  /**
   * Un cliente con ventas no se borra nunca (R1 del apartado 4): si se
   * borrara, su historial de cargas quedaría huérfano. Se desactiva y
   * deja de aparecer al asignar.
   */
  activo: boolean;
  /**
   * El comprador esporadico que no justifica darle de alta un perfil
   * (R4 del apartado 4). Hay uno solo: "Mostrador".
   *
   * Es una BOCA, no una persona: no tiene CUIT, ni telefono, ni
   * direccion, y su historial mezcla gente distinta. Por eso no se
   * edita ni se desactiva — si alguien lo apaga, las ventas sueltas se
   * quedan sin donde caer y vuelven a ser cargas sin cliente.
   *
   * Es un campo y no un id hardcodeado para que sobreviva a la
   * migracion a Supabase: la fila puede cambiar de id, la marca no.
   */
  generico: boolean;
}

export interface Material {
  nombre: string;
  /** Existencia deducida — los silos no tienen balanza. */
  restante: number | null;
  capacidad: number | null;
  /** En lo que lo pesa la planta. */
  unidad: string;
  /** En lo que se lo compra: tonelada, metro cubico, litro (R4). */
  unidadCompra?: string;
  /** Cuantas unidades de planta entran en una de compra (R4). */
  factorConversion?: number;
  /**
   * Si el PLC lo pesa. Un material que se echa con jarra no puede
   * descontar stock solo (R5): o se carga a mano o se estima por receta,
   * y hay que saber cual de las dos.
   */
  medidoPorPlc?: boolean;
  /** El agua sale del pozo: se consume pero no hay existencia que cuidar. */
  sinStock?: boolean;
  /** Consumo promedio por día con producción. */
  consumoDiario: number;
  /** Para que la alerta de reposición diga a quién llamar (apartado 6). */
  proveedor?: { nombre: string; telefono: string };
}
