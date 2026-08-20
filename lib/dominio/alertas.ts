import type { Tono } from '@/components/dominio/tono';
import type { Carga } from '@/lib/datos/tipos';
import type { Material } from '@/lib/datos/tipos';
import { UMBRALES } from './umbrales';

/** Costo de referencia del cemento, $/kg. Sale de la última compra (apartado 6). */
const COSTO_CEMENTO = 186;

export interface Alerta {
  id: string;
  tono: Tono;
  titulo: string;
  detalle: string;
  /** Texto del botón. La R2 pide que toda alerta lleve a resolverse. */
  accion: string;
  /** Apartado que la resuelve. Todavía no existe: ver TASK-006. */
  destino: string;
}

const porcentaje = (objetivo: number, real: number) =>
  objetivo ? ((real - objetivo) / objetivo) * 100 : 0;

/**
 * La alerta de calibración — la que pidió José.
 *
 * No la dispara un desvío puntual: siempre hay algo de desvío y avisar por
 * cada carga es ruido que se aprende a ignorar. La dispara que la
 * **tendencia crezca**: se promedia el desvío de las últimas N cargas y se
 * compara contra las N anteriores. Hace falta que suba y que además pase
 * el umbral.
 *
 * El corolario importa tanto como la alerta: cuando calibran, el promedio
 * baja, la comparación deja de dar creciente y **la alerta se apaga sola**.
 * Es la única forma de que José sepa si la calibración sirvió.
 */
export function tendenciaDeDesvio(cargas: Carga[], material: string) {
  const serie = [...cargas]
    .sort((a, b) => a.momento.localeCompare(b.momento))
    .map((c) => c.pesadas.find((p) => p.material === material))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => porcentaje(p.objetivo, p.real));

  const n = UMBRALES.ventanaCargas;
  if (serie.length < n * 2) return null;

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const reciente = media(serie.slice(-n));
  const previa = media(serie.slice(-n * 2, -n));

  return {
    reciente,
    previa,
    crece: reciente - previa >= UMBRALES.crecimientoMinimo,
    superaUmbral: reciente >= UMBRALES.desvioParaCalibrar,
  };
}

/** Kilos de más por mes, al ritmo de las últimas cargas. */
function kilosDeMasPorMes(cargas: Carga[], material: string, desvioPct: number) {
  const recientes = cargas.slice(-UMBRALES.ventanaCargas);
  const objetivoPromedio =
    recientes
      .map((c) => c.pesadas.find((p) => p.material === material)?.objetivo ?? 0)
      .reduce((a, b) => a + b, 0) / (recientes.length || 1);

  const cargasPorDia = recientes.length / 7;
  return objetivoPromedio * (desvioPct / 100) * cargasPorDia * 30;
}

export interface EstadoPlanta {
  ultimaCarga: string | null;
  horasSinDatos: number;
  enLinea: boolean;
}

export function estadoDePlanta(cargas: Carga[], ahora: Date): EstadoPlanta {
  const ultima = cargas.at(-1);
  if (!ultima) return { ultimaCarga: null, horasSinDatos: Infinity, enLinea: false };

  const horas = (ahora.getTime() - new Date(ultima.momento).getTime()) / 36e5;
  return {
    ultimaCarga: ultima.momento,
    horasSinDatos: horas,
    enLinea: horas < UMBRALES.horasSinDatos,
  };
}

export function derivarAlertas(
  cargas: Carga[],
  materiales: Material[],
  ahora: Date
): Alerta[] {
  const alertas: Alerta[] = [];
  const planta = estadoDePlanta(cargas, ahora);

  // R4 — el silencio también es información. Va primero: si la planta no
  // manda datos, todo lo demás que se muestre está incompleto.
  if (!planta.enLinea) {
    alertas.push({
      id: 'sin-datos',
      tono: 'danger',
      titulo: `Hace ${Math.floor(planta.horasSinDatos)} horas que no recibo datos de la planta`,
      detalle:
        'Puede ser que no se esté produciendo, o que se haya cortado la conexión con el HMI. Los números de abajo son los últimos que llegaron.',
      accion: 'Diagnosticar',
      destino: 'conexion',
    });
  }

  const sinAsignar = cargas.filter((c) => c.estado === 'registrada' && !c.cliente);
  if (sinAsignar.length > 0) {
    const m3 = sinAsignar.reduce((a, c) => a + c.m3, 0);
    alertas.push({
      id: 'sin-asignar',
      tono: 'warn',
      titulo:
        sinAsignar.length === 1
          ? 'Hay una carga sin cliente'
          : `Hay ${sinAsignar.length} cargas sin cliente`,
      detalle: `${m3} m³ producidos que todavía no son una venta. Sin cliente no hay precio, ni documento, ni margen.`,
      accion: 'Asignar',
      destino: 'cargas',
    });
  }

  for (const material of ['Cemento', 'Arena', 'Piedra']) {
    const t = tendenciaDeDesvio(cargas, material);
    if (!t || !t.crece || !t.superaUmbral) continue;

    const kilos = kilosDeMasPorMes(cargas, material, t.reciente);
    alertas.push({
      id: `calibrar-${material.toLowerCase()}`,
      tono: 'danger',
      titulo: `La balanza de ${material.toLowerCase()} carga ${t.reciente.toFixed(1)}% de más`,
      detalle: `Viene subiendo: era ${t.previa.toFixed(1)}% en las cargas anteriores. Al ritmo de hoy son ${Math.round(kilos).toLocaleString('es-AR')} kg por mes — unos ${Math.round((kilos * COSTO_CEMENTO) / 1000).toLocaleString('es-AR')} mil pesos que se van sin facturar.`,
      accion: 'Ver desvíos',
      destino: 'recetas',
    });
  }

  for (const m of materiales) {
    const dias = m.consumoDiario ? Math.floor(m.restante / m.consumoDiario) : Infinity;
    if (dias > UMBRALES.diasParaReponer) continue;
    alertas.push({
      id: `quiebre-${m.nombre.toLowerCase()}`,
      tono: dias <= 2 ? 'danger' : 'warn',
      titulo:
        dias <= 0
          ? `${m.nombre}: te quedaste sin stock`
          : `${m.nombre} para ${dias} ${dias === 1 ? 'día' : 'días'}`,
      detalle: `Quedan ${m.restante.toLocaleString('es-AR')} ${m.unidad} estimados al ritmo de los últimos días. El número es deducido: los silos no tienen balanza.`,
      accion: 'Ver proveedor',
      destino: 'stock',
    });
  }

  const sospechosas = cargas.filter((c) => c.sospechosa);
  if (sospechosas.length > 0) {
    alertas.push({
      id: 'sospechosas',
      tono: 'warn',
      titulo: `${sospechosas.length} carga${sospechosas.length > 1 ? 's' : ''} con valores fuera de rango`,
      detalle:
        'No se rechazaron, se marcaron. Si las direcciones Modbus se corrieron, los números son creíbles pero falsos.',
      accion: 'Revisar',
      destino: 'cargas',
    });
  }

  const recetaRara = cargas.filter((c) =>
    c.pesadas.some((p) => Math.abs(p.objetivo - p.receta) / (p.receta || 1) > 0.02)
  );
  if (recetaRara.length > 0) {
    alertas.push({
      id: 'receta-rara',
      tono: 'warn',
      titulo: 'El PLC está pidiendo algo distinto a la receta declarada',
      detalle: `${recetaRara.length} carga${recetaRara.length > 1 ? 's' : ''} con el objetivo fuera de la fórmula. Esto no se arregla calibrando: se corrige la receta.`,
      accion: 'Comparar',
      destino: 'recetas',
    });
  }

  return alertas;
}
