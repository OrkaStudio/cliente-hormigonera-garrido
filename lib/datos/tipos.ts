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
  restante: number;
  capacidad: number;
  unidad: string;
  /** Consumo promedio por día con producción. */
  consumoDiario: number;
  /** Para que la alerta de reposición diga a quién llamar (apartado 6). */
  proveedor?: { nombre: string; telefono: string };
}
