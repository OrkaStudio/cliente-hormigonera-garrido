import type { Tono } from '@/components/dominio/tono';
import type { Carga } from '@/lib/datos/tipos';
import type { Material } from '@/lib/datos/tipos';
import { fechaDeMomento, hora } from '@/lib/formato';
import { UMBRALES } from './umbrales';

/** Dos momentos que caen en el mismo dia del calendario local. */
function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Cuando se produjeron estas cargas, dicho sin ambiguedad.
 *
 * La alerta de "sin cliente" mira TODO el historico, pero convive en la
 * pantalla con KPIs que miran solo hoy. Pasada la medianoche eso daba
 * "CARGAS 0" al lado de "hay una carga sin cliente — 6 m3", que se lee
 * como una contradiccion. La alerta tiene que datarse.
 *
 * Con fecha y no con "ayer": el texto relativo se calcula contra el
 * reloj y no siempre coincide con el del navegador — el mismo motivo
 * que ya esta escrito en `fechaDeMomento`.
 */
function cuandoFueron(momentos: string[], ahora: Date): string {
  const fechas = momentos.map((m) => new Date(m)).sort((a, b) => a.getTime() - b.getTime());
  const primera = fechas[0]!;
  const ultima = fechas.at(-1)!;

  if (mismoDia(primera, ahora) && mismoDia(ultima, ahora)) return 'hoy';
  if (mismoDia(primera, ultima)) return `el ${fechaDeMomento(primera.toISOString())}`;
  return `entre el ${fechaDeMomento(primera.toISOString())} y el ${fechaDeMomento(ultima.toISOString())}`;
}

/** Costo de referencia del cemento, $/kg. Sale de la última compra (apartado 6). */
const COSTO_CEMENTO = 186;

/** Una fila del desplegable: lo concreto con lo que se resuelve la alerta. */
export interface FilaDetalle {
  clave: string;
  etiqueta: string;
  valor: string;
  tono?: Tono;
}

export interface Alerta {
  id: string;
  tono: Tono;
  titulo: string;
  detalle: string;
  /**
   * Texto del botón. La R2 pide que toda alerta lleve a resolverse — y
   * mientras los apartados 2, 5 y 7 no existan, se resuelve acá mismo:
   * el botón despliega `filas`, que es lo que hace falta para actuar.
   */
  accion: string;
  /** Apartado que la va a resolver del todo, cuando exista. */
  destino: string;
  /** Encabezado del desplegable. */
  tituloDetalle?: string;
  filas?: FilaDetalle[];
  /** Nota al pie del desplegable: el porqué, o lo que falta. */
  pieDetalle?: string;
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

  const sinAsignar = cargas.filter((c) => c.estado === 'registrada' && !c.clienteId);
  if (sinAsignar.length > 0) {
    const m3 = sinAsignar.reduce((a, c) => a + c.m3, 0);
    const cuando = cuandoFueron(
      sinAsignar.map((c) => c.momento),
      ahora,
    );
    alertas.push({
      id: 'sin-asignar',
      tono: 'warn',
      titulo:
        sinAsignar.length === 1
          ? 'Hay una carga sin cliente'
          : `Hay ${sinAsignar.length} cargas sin cliente`,
      detalle: `${m3} m³ producidos ${cuando} que todavía no son una venta. Sin cliente no hay precio, ni documento, ni margen.`,
      accion: 'Ver cuáles',
      destino: 'cargas',
      tituloDetalle: 'Cargas esperando cliente',
      filas: sinAsignar.map((c) => ({
        clave: c.id,
        // Con la hora sola, una carga de anteayer parecia de esta manana.
        etiqueta: mismoDia(new Date(c.momento), ahora)
          ? hora(c.momento)
          : `${fechaDeMomento(c.momento)} ${hora(c.momento)}`,
        valor: `${c.m3} m³ de ${c.receta}`,
        tono: 'warn' as const,
      })),
      pieDetalle:
        'Asignar el cliente es lo que las convierte en venta. La pantalla para hacerlo es el apartado 2, todavía sin construir.',
    });
  }

  for (const material of ['Cemento', 'Arena', 'Piedra']) {
    const t = tendenciaDeDesvio(cargas, material);
    if (!t || !t.crece || !t.superaUmbral) continue;

    const kilos = kilosDeMasPorMes(cargas, material, t.reciente);
    const ultimas = [...cargas]
      .sort((a, b) => a.momento.localeCompare(b.momento))
      .slice(-8);

    alertas.push({
      id: `calibrar-${material.toLowerCase()}`,
      tono: 'danger',
      titulo: `La balanza de ${material.toLowerCase()} carga ${t.reciente.toFixed(1)}% de más`,
      detalle: `Viene subiendo: era ${t.previa.toFixed(1)}% en las cargas anteriores. Al ritmo de hoy son ${Math.round(kilos).toLocaleString('es-AR')} kg por mes — unos ${Math.round((kilos * COSTO_CEMENTO) / 1000).toLocaleString('es-AR')} mil pesos que se van sin facturar.`,
      accion: 'Ver desvíos',
      destino: 'recetas',
      tituloDetalle: `Últimas ${ultimas.length} cargas · ${material.toLowerCase()} pedido contra pesado`,
      filas: ultimas.map((c) => {
        const p = c.pesadas.find((x) => x.material === material)!;
        const pct = porcentaje(p.objetivo, p.real);
        return {
          clave: c.id,
          etiqueta: new Date(c.momento).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          valor: `${p.objetivo.toLocaleString('es-AR')} → ${p.real.toLocaleString('es-AR')} kg   ${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`,
          tono: pct > 3 ? ('danger' as const) : pct > 1 ? ('warn' as const) : ('ok' as const),
        };
      }),
      pieDetalle:
        'Todas se van para el mismo lado: eso es balanza descalibrada, no ruido. Si se fueran para cualquier lado, no habría nada que calibrar.',
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
      accion: 'A quién llamar',
      destino: 'stock',
      tituloDetalle: 'Reposición',
      filas: [
        ...(m.proveedor
          ? [
              { clave: 'prov', etiqueta: 'Proveedor', valor: m.proveedor.nombre },
              { clave: 'tel', etiqueta: 'Teléfono', valor: m.proveedor.telefono },
            ]
          : []),
        {
          clave: 'consumo',
          etiqueta: 'Consumo diario',
          valor: `${m.consumoDiario.toLocaleString('es-AR')} ${m.unidad}`,
        },
        {
          clave: 'llenar',
          etiqueta: 'Para llenar el silo',
          valor: `${(m.capacidad - m.restante).toLocaleString('es-AR')} ${m.unidad}`,
        },
      ],
      pieDetalle:
        'La existencia es deducida, no medida. Conviene pedir con margen: si el silo está más vacío de lo que dice la cuenta, el quiebre llega antes.',
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
