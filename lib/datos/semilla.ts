import type { Carga, Material } from './tipos';

/**
 * Datos sembrados.
 *
 * Existen porque todavía no hay proyecto de Supabase, y porque el
 * bloqueante del PLC no tiene por qué frenar la construcción. Se generan
 * relativos al momento de la consulta para que la pantalla sea siempre
 * la de hoy.
 *
 * El desvío del cemento NO está escrito a mano: se genera con una deriva
 * creciente para que la alerta de calibración salga del cálculo, como va
 * a salir en producción. Si alguien toca el umbral, la alerta responde.
 */

const CLIENTES = [
  'Constructora del Este SRL',
  'Obras Monte SA',
  'Corralón El Ladrillo',
  'Riquelme e Hijos',
];

const RECETAS: Record<string, { m3PorCarga: number; precio: number; cemento: number; arena: number; piedra: number }> = {
  'H-21': { m3PorCarga: 7, precio: 89000, cemento: 320, arena: 780, piedra: 1050 },
  'H-25': { m3PorCarga: 6, precio: 94000, cemento: 340, arena: 760, piedra: 1040 },
  'H-30': { m3PorCarga: 6, precio: 99000, cemento: 380, arena: 730, piedra: 1020 },
};

/** Determinista: la misma semilla da siempre la misma planta. */
function aleatorio(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function generarCargas(ahora: Date): Carga[] {
  const rnd = aleatorio(20260820);
  const cargas: Carga[] = [];
  const nombresReceta = Object.keys(RECETAS);

  // 6 días hacia atrás, para que la ventana de tendencia tenga con qué comparar.
  for (let dia = 6; dia >= 0; dia--) {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - dia);
    const esHoy = dia === 0;
    const cuantas = esHoy ? 5 : 6 + Math.floor(rnd() * 3);

    for (let i = 0; i < cuantas; i++) {
      const receta = nombresReceta[Math.floor(rnd() * nombresReceta.length)]!;
      const r = RECETAS[receta]!;
      const momento = new Date(fecha);
      momento.setHours(7 + i * 2, Math.floor(rnd() * 55), 0, 0);

      // Hoy no se produce en el futuro.
      if (esHoy && momento > ahora) break;

      // La deriva de la balanza de cemento: crece con los días.
      const deriva = 0.006 + (6 - dia) * 0.0022;
      const ruido = () => (rnd() - 0.5) * 0.004;

      const sinCliente = esHoy && i === 2;
      const cliente = sinCliente ? null : CLIENTES[Math.floor(rnd() * CLIENTES.length)]!;

      cargas.push({
        id: `C-${1000 + cargas.length}`,
        momento: momento.toISOString(),
        receta,
        m3: r.m3PorCarga,
        cliente,
        estado: sinCliente ? 'registrada' : dia === 0 ? 'asignada' : 'facturada',
        fiscal: sinCliente ? null : rnd() > 0.35 ? 'blanco' : 'negro',
        total: sinCliente ? 0 : Math.round(r.m3PorCarga * r.precio),
        pesadas: [
          {
            material: 'Cemento',
            receta: r.cemento * r.m3PorCarga,
            objetivo: r.cemento * r.m3PorCarga,
            real: Math.round(r.cemento * r.m3PorCarga * (1 + deriva + ruido())),
          },
          {
            material: 'Arena',
            receta: r.arena * r.m3PorCarga,
            objetivo: r.arena * r.m3PorCarga,
            real: Math.round(r.arena * r.m3PorCarga * (1 + ruido())),
          },
          {
            material: 'Piedra',
            receta: r.piedra * r.m3PorCarga,
            objetivo: r.piedra * r.m3PorCarga,
            real: Math.round(r.piedra * r.m3PorCarga * (1 + ruido())),
          },
        ],
      });
    }
  }

  return cargas;
}

export const MATERIALES: Material[] = [
  { nombre: 'Cemento', restante: 12400, capacidad: 50000, unidad: 'kg', consumoDiario: 4100 },
  { nombre: 'Arena', restante: 41000, capacidad: 80000, unidad: 'kg', consumoDiario: 3600 },
  { nombre: 'Piedra', restante: 58000, capacidad: 80000, unidad: 'kg', consumoDiario: 3000 },
];
