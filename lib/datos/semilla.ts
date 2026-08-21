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
    generico: false,
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
    generico: false,
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
    generico: false,
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
    generico: false,
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
    generico: true,
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
    generico: false,
  },
];

export const RECETAS: Record<string, { m3PorCarga: number; precio: number; cemento: number; arena: number; piedra: number }> = {
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

/**
 * Cuántos días de historia se generan.
 *
 * Eran 7, que alcanzaban para Inicio pero no para Rentabilidad: "contra
 * el mes pasado" necesita que exista un mes pasado. Con cuatro meses hay
 * tres comparaciones posibles y las series tienen forma.
 */
const DIAS_DE_HISTORIA = 120;

/**
 * Inflación mensual, en tanto por uno.
 *
 * No es decoración argentina: es lo que hace que el margen mienta. Los
 * costos de material suben un poco MÁS que los precios de venta —el
 * precio se pelea con el cliente, el costo lo pone el proveedor— así que
 * el margen se achica solo aunque los números de facturación crezcan. Ese
 * es exactamente el efecto que Rentabilidad tiene que dejar ver.
 */
const INFLACION_PRECIO = 0.038;
const INFLACION_COSTO = 0.046;

/** Cuánto se movió un valor entre hace `dia` días y hoy. */
export function factorInflacion(dia: number, mensual: number): number {
  const meses = dia / 30;
  return 1 / Math.pow(1 + mensual, meses);
}

export function generarCargas(ahora: Date): Carga[] {
  const rnd = aleatorio(20260820);
  const cargas: Carga[] = [];
  const nombresReceta = Object.keys(RECETAS);

  for (let dia = DIAS_DE_HISTORIA; dia >= 0; dia--) {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - dia);
    const esHoy = dia === 0;

    // Domingo no se produce, y el sábado a media máquina: sin esto la
    // serie por día es una recta y no se parece a ninguna planta.
    const diaSemana = fecha.getDay();
    if (diaSemana === 0) continue;
    const cuantas = esHoy ? 5 : diaSemana === 6 ? 2 + Math.floor(rnd() * 2) : 5 + Math.floor(rnd() * 4);

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

      /**
       * La deriva de la balanza de cemento.
       *
       * Crece de a poco y se resetea cuando la mandan a calibrar. Los
       * ciclos de 45 días son los que hacen que la alerta de Inicio se
       * apague sola después de una calibración, en vez de quedar prendida
       * para siempre.
       */
      const enElCiclo = dia % 45;
      const deriva = 0.004 + (44 - enElCiclo) * 0.00042;
      const ruido = () => (rnd() - 0.5) * 0.004;

      // Precio y costo de ESE día. La venta congela el precio del momento
      // (R2): recalcular el pasado con el precio de hoy convertiría el
      // historial en ficción.
      const precioDelDia = Math.round(r.precio * factorInflacion(dia, INFLACION_PRECIO));

      // Quién puede comprar en este día. El inactivo sólo aparece en las
      // cargas viejas: dejó de comprar, pero su historial sigue ahí — que
      // es exactamente lo que la R1 promete y hay que poder ver.
      const compradores = CLIENTES.filter((c) => c.activo || dia >= 4);
      const sinCliente = esHoy && i === 2;
      const cliente = sinCliente ? null : compradores[Math.floor(rnd() * compradores.length)]!;
      const clienteId = cliente?.id ?? null;

      const total = sinCliente ? 0 : Math.round(r.m3PorCarga * precioDelDia);

      // Como se reparte el corte fiscal en la maqueta. La mitad va
      // entera en blanco, un cuarto entero en negro, y un cuarto sale
      // partido — que es el caso que existe de verdad en la planta y
      // que la app no sabia representar hasta ahora.
      const dado = rnd();
      const montoFacturado = sinCliente
        ? null
        : dado < 0.5
          ? total
          : dado < 0.75
            ? 0
            : // Un corte "redondo", como se factura a mano: multiplo de
              // diez mil, nunca 0 ni el total (eso ya son los otros casos).
              Math.min(
                total - 10_000,
                Math.max(10_000, Math.round((total * (0.3 + rnd() * 0.5)) / 10_000) * 10_000),
              );

      cargas.push({
        id: `C-${1000 + cargas.length}`,
        momento: momento.toISOString(),
        receta,
        m3: r.m3PorCarga,
        clienteId,
        estado: sinCliente ? 'registrada' : dia === 0 ? 'asignada' : 'facturada',
        precioM3: sinCliente ? null : precioDelDia,
        montoFacturado,
        total,
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

/**
 * Costo por unidad de cada material, HOY.
 *
 * ⚠️ SEMBRADOS. Salen de precios de mercado verosímiles, no de compras
 * reales: el apartado 6 no existe todavía. Cuando exista, el costo de
 * referencia va a salir de la última compra y esta constante desaparece.
 * Mientras tanto, la pantalla dice de dónde viene el número.
 */
export const COSTO_MATERIAL: Record<string, number> = {
  // Calibrados para que el margen de materiales quede en 41–43% y el
  // cemento pese 75–78% del costo, que es la proporción que reporta el
  // rubro (70–80%). Con valores de mostrador —el cemento en bolsa ronda
  // los $186/kg— el margen daba 6%, que no es el de ninguna planta: una
  // hormigonera compra a granel, no en la ferretería.
  Cemento: 120,
  Arena: 6,
  Piedra: 8,
};

/** Lo que costaba un material hace `dia` días. */
export function costoMaterialEnDia(material: string, dia: number): number {
  const hoy = COSTO_MATERIAL[material] ?? 0;
  return hoy * factorInflacion(dia, INFLACION_COSTO);
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

/**
 * Lo que costaria hoy una carga de esta receta, para PROPONER un precio
 * al asignarle el cliente.
 *
 * Es una sugerencia, no el precio de la venta. El numero que queda
 * guardado es el que Jose confirma en ese momento y no se recalcula
 * nunca mas: con esta inflacion, un historico que se mueve hace mentir a
 * la rentabilidad entera. Ver decisiones/hormigonera-precio-en-la-venta.
 */
export function precioSugerido(receta: string, m3: number): number {
  const r = RECETAS[receta];
  return r ? Math.round(r.precio * m3) : 0;
}
