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
export type Fiscal = 'blanco' | 'negro';

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
  fiscal: Fiscal | null;
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
