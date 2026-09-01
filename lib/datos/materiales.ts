import {
  ADITIVO_POR_CEMENTO,
  COSTO_MATERIAL,
  MATERIALES,
  PROVEEDORES,
  RECETAS,
  generarCargas,
  generarCompras,
  inventarioInicial,
} from './semilla';
import { consumoDiarioDe } from '@/lib/dominio/stock';
import { costoDeReposicion, stockDeducido, ultimaCompra } from '@/lib/dominio/compras';

/**
 * La consulta del apartado unificado: Stock y Recetas.
 *
 * Se unieron porque comparten el sujeto — el material — y porque el stock
 * DEPENDE de las recetas: sin saber cuánto lleva cada m³, no hay forma de
 * estimar el consumo de lo que no pesa el PLC.
 *
 * Desde el 01/09 absorbe también el apartado 6, Compras y proveedores: la
 * compra es la mitad de arriba de la resta con la que se deduce el stock,
 * y el proveedor es a quién llamar cuando el silo se está por vaciar. No
 * hay pantalla de Proveedores —son tres, uno por material— y la
 * comparación de precios que la justificaría sólo tiene sentido adentro
 * de un material → decisiones/hormigonera-compras-adentro-de-materiales
 */
export async function traerMateriales(ahora = new Date()) {
  const cargas = generarCargas(ahora);
  const compras = generarCompras(ahora, cargas);
  /* El punto de partida de la resta. Los ajustes que alguien haya hecho a
     ojo viven en el navegador, así que se suman del lado del cliente. */
  const inicial = inventarioInicial(ahora);

  // Los últimos 30 días, para el consumo diario sobre días CON producción (R8).
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - 30);
  const recientes = cargas.filter((c) => new Date(c.momento) >= desde);

  const diasConProduccion = new Set(
    recientes.map((c) => new Date(c.momento).toDateString()),
  ).size;

  const materiales = MATERIALES.map((m) => {
    const { porDia } = consumoDiarioDe(m.nombre, recientes);
    const deduccion = stockDeducido(m, compras, cargas, inicial);
    const reposicion = costoDeReposicion(m.nombre, compras, m.factorConversion ?? 1);

    return {
      ...m,
      consumoDiario: porDia || m.consumoDiario,
      /*
       * El stock DEDUCIDO, no el declarado.
       *
       * Antes esto era la constante de la semilla debajo de un cartel que
       * decía "la existencia se deduce restando lo que consumió cada
       * carga". Ahora lo hace de verdad: último conteo + compras −
       * consumo (R1 del apartado 7).
       */
      restante: deduccion.restante,
      deduccion,
      compras: compras.filter((c) => c.material === m.nombre && !c.anulada).reverse(),
      ultimaCompra: ultimaCompra(m.nombre, compras),
      /*
       * El costo de reponer HOY sale de la última compra (R2 del apartado
       * 6, marcada "confirmar con José"). El de la semilla queda de
       * respaldo para cuando un material todavía no tiene compras: R7
       * pide decirlo, no inventarlo.
       */
      costo: reposicion?.costo ?? COSTO_MATERIAL[m.nombre] ?? null,
      costoDe: reposicion?.momento ?? null,
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

  return {
    ahora,
    materiales,
    recetas,
    diasConProduccion,
    proveedores: PROVEEDORES,
    /** Todas las compras, para el historial del apartado 6. */
    compras: [...compras].reverse(),
    inventarioInicial: inicial,
  };
}

export type DatosMateriales = Awaited<ReturnType<typeof traerMateriales>>;
