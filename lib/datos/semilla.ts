import type { Carga, Cliente, Material } from './tipos';

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

/**
 * Los clientes son entidades con id, no un nombre suelto adentro de la
 * carga: es `cargas.cliente_id` lo que ata las dos cosas (apartado 4,
 * sección 6). Atarlas por el nombre se desarma apenas alguien renombre
 * un cliente o entren dos parecidos.
 */
export const CLIENTES: Cliente[] = [
  {
    id: 'CL-01',
    nombre: 'Constructora del Este SRL',
    contacto: 'Marcelo Duarte',
    telefono: '2241 40-1180',
    mail: 'compras@constructoradeleste.com.ar',
    direccion: 'Av. San Martín 1240, Monte',
    cuit: '30-71044821-9',
    notas: null,
    activo: true,
  },
  {
    id: 'CL-02',
    nombre: 'Obras Monte SA',
    contacto: 'Silvia Ferraro',
    telefono: '2241 41-2907',
    mail: 'administracion@obrasmonte.com.ar',
    direccion: 'Ruta 3 km 108, Monte',
    cuit: '30-70918334-2',
    notas: null,
    activo: true,
  },
  {
    id: 'CL-03',
    nombre: 'Corralón El Ladrillo',
    contacto: 'Rubén Ibáñez',
    telefono: '2241 15-63-4402',
    mail: null,
    direccion: 'Belgrano 855, Monte',
    cuit: '20-16884203-4',
    notas: null,
    activo: true,
  },
  {
    id: 'CL-04',
    nombre: 'Riquelme e Hijos',
    contacto: 'Daniel Riquelme',
    telefono: '2241 15-70-1156',
    mail: null,
    direccion: 'Chacabuco 320, Monte',
    cuit: null,
    notas: null,
    activo: true,
  },
  {
    id: 'CL-05',
    nombre: 'Mostrador',
    contacto: null,
    telefono: null,
    mail: null,
    direccion: null,
    cuit: null,
    notas: 'La venta suelta que no justifica dar de alta a nadie (R4). No se borra ni se edita.',
    activo: true,
  },
  {
    id: 'CL-06',
    nombre: 'Pérez Construcciones',
    contacto: 'Hugo Pérez',
    telefono: '2241 15-44-8890',
    mail: null,
    direccion: 'Sarmiento 47, Monte',
    cuit: '20-13290477-1',
    notas: 'Dejó de comprar en marzo. Se desactiva, no se borra: sus ventas siguen en el historial.',
    activo: false,
  },
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
      if (esHoy) {
        // Las cargas de hoy se reparten hacia atrás desde hace ~35 min, para
        // que la pantalla muestre una planta produciendo y no una que dejó
        // de mandar datos hace horas. La alerta de silencio de la R4 sigue
        // saliendo del cálculo: si el reloj avanza y no entran cargas, salta.
        momento.setTime(ahora.getTime() - (35 + (cuantas - 1 - i) * 105) * 60_000);
      } else {
        momento.setHours(7 + i * 2, Math.floor(rnd() * 55), 0, 0);
      }

      // La deriva de la balanza de cemento: crece con los días.
      const deriva = 0.006 + (6 - dia) * 0.0022;
      const ruido = () => (rnd() - 0.5) * 0.004;

      // Quién puede comprar en este día. El inactivo sólo aparece en las
      // cargas viejas: dejó de comprar, pero su historial sigue ahí — que
      // es exactamente lo que la R1 promete y hay que poder ver.
      const compradores = CLIENTES.filter((c) => c.activo || dia >= 4);
      const sinCliente = esHoy && i === 2;
      const cliente = sinCliente ? null : compradores[Math.floor(rnd() * compradores.length)]!;
      const clienteId = cliente?.id ?? null;

      cargas.push({
        id: `C-${1000 + cargas.length}`,
        momento: momento.toISOString(),
        receta,
        m3: r.m3PorCarga,
        clienteId,
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
  {
    nombre: 'Cemento',
    restante: 12400,
    capacidad: 50000,
    unidad: 'kg',
    consumoDiario: 4100,
    proveedor: { nombre: 'Cementos Avellaneda', telefono: '+54 9 2271 40-2211' },
  },
  {
    nombre: 'Arena',
    restante: 41000,
    capacidad: 80000,
    unidad: 'kg',
    consumoDiario: 3600,
    proveedor: { nombre: 'Arenera del Salado', telefono: '+54 9 2241 33-7788' },
  },
  {
    nombre: 'Piedra',
    restante: 58000,
    capacidad: 80000,
    unidad: 'kg',
    consumoDiario: 3000,
    proveedor: { nombre: 'Canteras Monte', telefono: '+54 9 2271 45-9010' },
  },
];
