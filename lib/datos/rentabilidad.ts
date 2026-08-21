import { CLIENTES, COSTO_MATERIAL, costoMaterialEnDia, generarCargas } from './semilla';
import type { Carga } from './tipos';
import {
  carreraDePrecios,
  costoDeCarga,
  resumirPeriodo,
  variacion,
  type ResumenPeriodo,
} from '@/lib/dominio/rentabilidad';

/**
 * La consulta de Rentabilidad.
 *
 * Igual que en Inicio: hoy lee de la semilla y es async a propósito. El
 * día que entre Supabase cambia el cuerpo y la pantalla no se entera.
 *
 * ⚠️ Los COSTOS son sembrados. El apartado 6 (Compras) no existe, así que
 * no hay una última compra de la cual sacar el costo de referencia. La
 * pantalla lo dice; no se disimula.
 */

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Cuántos días atrás quedó ese momento. Para buscar el costo de esa fecha. */
function diasAtras(momento: string, ahora: Date) {
  return Math.max(0, Math.round((ahora.getTime() - new Date(momento).getTime()) / 86_400_000));
}

function claveMes(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export type Rango = 'mes' | 'trimestre';

export async function traerRentabilidad(rango: Rango = 'mes', ahora = new Date()) {
  const todas = generarCargas(ahora).filter((c) => c.estado !== 'anulada' && c.clienteId);

  /** El costo de un material a la fecha de la carga, no el de hoy (R2). */
  const costoEn = (material: string, momento: string) =>
    COSTO_MATERIAL[material] === undefined
      ? null
      : costoMaterialEnDia(material, diasAtras(momento, ahora));

  // ── Los meses, para las series ────────────────────────────────────────
  const porMes = new Map<string, Carga[]>();
  for (const c of todas) {
    const k = claveMes(c.momento);
    porMes.set(k, [...(porMes.get(k) ?? []), c]);
  }

  const meses = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, cargas]) => {
      const [anio, mes] = clave.split('-').map(Number);
      return {
        clave,
        etiqueta: MES[mes!]!,
        enCurso: mes === ahora.getMonth() && anio === ahora.getFullYear(),
        resumen: resumirPeriodo(cargas, costoEn),
      };
    });

  // ── El período que se está mirando y con qué se compara ───────────────
  const cortar = (desde: Date) => todas.filter((c) => new Date(c.momento) >= desde);

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesPrevio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const inicioTrim = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
  const inicioTrimPrevio = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

  const desde = rango === 'mes' ? inicioMes : inicioTrim;
  const desdePrevio = rango === 'mes' ? inicioMesPrevio : inicioTrimPrevio;

  const delPeriodo = cortar(desde);

  /**
   * El período anterior se corta en el MISMO día del mes.
   *
   * Comparar 21 días de agosto contra 31 de julio siempre da una caída
   * que no existe — es el error más común de cualquier tablero mensual, y
   * en este daría "facturaste 30% menos" cuando en realidad faltan diez
   * días de producción.
   */
  const hastaPrevio =
    rango === 'mes'
      ? new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate(), 23, 59, 59)
      : desde;

  const delPrevio = todas.filter((c) => {
    const t = new Date(c.momento);
    return t >= desdePrevio && t < hastaPrevio;
  });

  const actual = resumirPeriodo(delPeriodo, costoEn);
  const previo = resumirPeriodo(delPrevio, costoEn);

  /**
   * Qué parte del mes cubre lo mirado. Los costos fijos se prorratean con
   * esto: cargarle el sueldo entero a cinco días de producción daría un
   * resultado catastrófico y falso.
   */
  const diasDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
  const proporcion = rango === 'mes' ? ahora.getDate() / diasDelMes : 3;

  // ── Por receta ────────────────────────────────────────────────────────
  const recetas = new Map<string, Carga[]>();
  for (const c of delPeriodo) recetas.set(c.receta, [...(recetas.get(c.receta) ?? []), c]);

  const porReceta = [...recetas.entries()]
    .map(([receta, cargas]) => ({ receta, ...resumirPeriodo(cargas, costoEn) }))
    .sort((a, b) => b.margenPorM3 - a.margenPorM3);

  // ── Por cliente, ordenado por lo que DEJA, no por lo que compra ───────
  const clientes = new Map<string, Carga[]>();
  for (const c of delPeriodo) {
    if (!c.clienteId) continue;
    clientes.set(c.clienteId, [...(clientes.get(c.clienteId) ?? []), c]);
  }

  const porCliente = [...clientes.entries()]
    .map(([id, cargas]) => ({
      id,
      nombre: CLIENTES.find((c) => c.id === id)?.nombre ?? id,
      ...resumirPeriodo(cargas, costoEn),
    }))
    .sort((a, b) => b.margenMateriales - a.margenMateriales);

  // ── Dónde se va la plata de los materiales ────────────────────────────
  const materiales = new Map<string, number>();
  for (const c of delPeriodo) {
    const r = costoDeCarga(c, (m) => costoEn(m, c.momento));
    for (const m of r.porMaterial) {
      materiales.set(m.material, (materiales.get(m.material) ?? 0) + m.costo);
    }
  }
  const porMaterial = [...materiales.entries()]
    .map(([material, costo]) => ({
      material,
      costo,
      pct: actual.costoMateriales ? (costo / actual.costoMateriales) * 100 : 0,
    }))
    .sort((a, b) => b.costo - a.costo);

  return {
    ahora,
    rango,
    actual,
    previo,
    proporcionDelMes: proporcion,
    /** El período mirado todavía no terminó: la comparación va a mismo día. */
    enCurso: rango === 'mes',
    diaDelMes: ahora.getDate(),
    variaciones: {
      facturado: variacion(actual.facturado, previo.facturado),
      costo: variacion(actual.costoMateriales, previo.costoMateriales),
      margen: variacion(actual.margenMateriales, previo.margenMateriales),
      m3: variacion(actual.m3, previo.m3),
      margenPct:
        previo.margenPct === 0 ? null : actual.margenPct - previo.margenPct,
    },
    carrera: carreraDePrecios(actual, previo),
    meses,
    porReceta,
    porCliente,
    porMaterial,
  };
}

export type DatosRentabilidad = Awaited<ReturnType<typeof traerRentabilidad>>;
export type { ResumenPeriodo };
