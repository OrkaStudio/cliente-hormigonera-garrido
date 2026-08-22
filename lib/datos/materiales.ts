import { ADITIVO_POR_CEMENTO, COSTO_MATERIAL, MATERIALES, RECETAS, generarCargas } from './semilla';
import { consumoDiarioDe } from '@/lib/dominio/stock';

/**
 * La consulta del apartado unificado: Stock y Recetas.
 *
 * Se unieron porque comparten el sujeto — el material — y porque el stock
 * DEPENDE de las recetas: sin saber cuánto lleva cada m³, no hay forma de
 * estimar el consumo de lo que no pesa el PLC.
 */
export async function traerMateriales(ahora = new Date()) {
  const cargas = generarCargas(ahora);

  // Los últimos 30 días, para el consumo diario sobre días CON producción (R8).
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - 30);
  const recientes = cargas.filter((c) => new Date(c.momento) >= desde);

  const diasConProduccion = new Set(
    recientes.map((c) => new Date(c.momento).toDateString()),
  ).size;

  const materiales = MATERIALES.map((m) => {
    const { porDia } = consumoDiarioDe(m.nombre, recientes);

    return {
      ...m,
      consumoDiario: porDia || m.consumoDiario,
      costo: COSTO_MATERIAL[m.nombre] ?? null,
      /** En qué recetas entra y cuánto lleva cada m³. */
      enRecetas: Object.entries(RECETAS).map(([codigo, r]) => ({
        codigo,
        porM3:
          m.nombre === 'Cemento'
            ? r.cemento
            : m.nombre === 'Áridos'
              ? r.aridos
              : m.nombre === 'Agua'
                ? r.agua
                : Math.round(r.cemento * ADITIVO_POR_CEMENTO * 100) / 100,
      })),
    };
  });

  const recetas = Object.entries(RECETAS).map(([codigo, r]) => {
    const aditivo = Math.round(r.cemento * ADITIVO_POR_CEMENTO * 100) / 100;
    const costoM3 =
      r.cemento * (COSTO_MATERIAL.Cemento ?? 0) +
      r.aridos * (COSTO_MATERIAL['Áridos'] ?? 0) +
      r.agua * (COSTO_MATERIAL.Agua ?? 0) +
      aditivo * (COSTO_MATERIAL.Aditivo ?? 0);

    return {
      codigo,
      precio: r.precio,
      costoM3,
      margenPct: r.precio ? ((r.precio - costoM3) / r.precio) * 100 : 0,
      /** Cuántas cargas de esta receta salieron en el mes. */
      cargas: recientes.filter((c) => c.receta === codigo).length,
      dosificacion: [
        { material: 'Cemento', porM3: r.cemento, unidad: 'kg' },
        { material: 'Áridos', porM3: r.aridos, unidad: 'kg' },
        { material: 'Agua', porM3: r.agua, unidad: 'L' },
        { material: 'Aditivo', porM3: aditivo, unidad: 'kg' },
      ],
    };
  });

  return { ahora, materiales, recetas, diasConProduccion };
}

export type DatosMateriales = Awaited<ReturnType<typeof traerMateriales>>;
