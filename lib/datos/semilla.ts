import type { AjusteStock } from '@/lib/dominio/stock';
import { consumoDe } from '@/lib/dominio/stock';
import type { Carga, Cliente, Compra, Material, Proveedor } from './tipos';

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

/**
 * Las recetas, con la dosificación por m³ que usa el PLC.
 *
 * Los valores salen del simulador (`simulador/planta.js`), que es el
 * mejor modelo que tenemos del autómata hasta que llegue el mapa de
 * GENROD. El aditivo va al 0,5% del cemento, como ahí.
 *
 * ⚠️ Los ÁRIDOS son uno solo. El PLC los pesa juntos y la app no puede
 * inventar cuánto fue arena y cuánto piedra — separarlos depende de
 * cuántas tolvas y balanzas haya, que es la pregunta 3.4 para GENROD.
 */
export const RECETAS: Record<
  string,
  { m3PorCarga: number; precio: number; cemento: number; agua: number; aridos: number }
> = {
  'H-21': { m3PorCarga: 7, precio: 89000, cemento: 284, agua: 160, aridos: 1930 },
  'H-25': { m3PorCarga: 6, precio: 94000, cemento: 320, agua: 162, aridos: 1920 },
  'H-30': { m3PorCarga: 6, precio: 99000, cemento: 350, agua: 165, aridos: 1900 },
};

/** El aditivo es proporcional al cemento, como en la planta. */
export const ADITIVO_POR_CEMENTO = 0.005;

/**
 * Los kilometros que suele haber hasta la obra de cada cliente.
 *
 * Sembrados. Cuando Jose cargue la distancia en cada venta, este mapa
 * desaparece y el numero sale del dato real.
 */
const DISTANCIA_TIPICA: Record<string, number> = {
  'CL-01': 14,
  'CL-02': 38,
  'CL-03': 8,
  'CL-04': 62,
  'CL-05': 6,
  'CL-06': 22,
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

      /**
       * A que distancia queda la obra de este cliente.
       *
       * Cada uno compra para obras que rondan siempre la misma zona, con
       * algo de variacion: el corralon esta en el pueblo, la constructora
       * tiene obras repartidas y hay una lejos que es justo la que menos
       * conviene. Ese contraste es lo que el apartado tiene que dejar ver.
       */
      const distanciaKm = sinCliente
        ? null
        : Math.round((DISTANCIA_TIPICA[clienteId!] ?? 15) * (0.7 + rnd() * 0.6));

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
        distanciaKm,
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
            material: 'Áridos',
            receta: r.aridos * r.m3PorCarga,
            objetivo: r.aridos * r.m3PorCarga,
            real: Math.round(r.aridos * r.m3PorCarga * (1 + ruido())),
          },
          {
            material: 'Agua',
            receta: r.agua * r.m3PorCarga,
            objetivo: r.agua * r.m3PorCarga,
            real: Math.round(r.agua * r.m3PorCarga * (1 + ruido() * 3)),
          },
          {
            material: 'Aditivo',
            receta: Math.round(r.cemento * r.m3PorCarga * ADITIVO_POR_CEMENTO * 10) / 10,
            objetivo: Math.round(r.cemento * r.m3PorCarga * ADITIVO_POR_CEMENTO * 10) / 10,
            real:
              Math.round(r.cemento * r.m3PorCarga * ADITIVO_POR_CEMENTO * (1 + ruido() * 5) * 10) /
              10,
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
  // Calibrados para que el margen de materiales quede en 38–41% y el
  // cemento pese cerca de dos tercios del costo, que es la proporción que
  // reporta el rubro. Con valores de mostrador —el cemento en bolsa ronda
  // los $186/kg— el margen daba 6%, que no es el de ninguna planta: una
  // hormigonera compra a granel, no en la ferretería.
  Cemento: 120,
  Áridos: 7.15,
  Aditivo: 3000,
  // El agua sale del pozo: el costo es la bomba, y no mueve la aguja.
  Agua: 0,
};

/** Lo que costaba un material hace `dia` días. */
export function costoMaterialEnDia(material: string, dia: number): number {
  const hoy = COSTO_MATERIAL[material] ?? 0;
  return hoy * factorInflacion(dia, INFLACION_COSTO);
}

export const MATERIALES: Material[] = [
  {
    nombre: 'Cemento',
    // Calibrados contra el consumo REAL de la produccion sembrada (~42 m³
    // por dia). Con los valores viejos —pensados para un consumo tres
    // veces menor— todos los materiales daban "aguanta 1 dia" y la
    // pantalla entera quedaba en rojo, que es la forma mas rapida de que
    // nadie mire las alertas.
    restante: 38200,
    capacidad: 50000,
    unidad: 'kg',
    unidadCompra: 't',
    factorConversion: 1000,
    consumoDiario: 4100,
    medidoPorPlc: true,
    proveedor: { nombre: 'Cementos Avellaneda', telefono: '+54 9 2271 40-2211' },
  },
  {
    nombre: 'Áridos',
    // Los áridos no van en silo: se acopian en pila, asi que la
    // "capacidad" es la del playón.
    restante: 462000,
    capacidad: 600000,
    unidad: 'kg',
    unidadCompra: 'm³',
    // Un m³ de árido pesa alrededor de 1,6 t. Sin este factor el stock no
    // cierra nunca: se compra por volumen y se pesa por kilo (R4).
    factorConversion: 1600,
    consumoDiario: 26000,
    medidoPorPlc: true,
    proveedor: { nombre: 'Arenera del Salado', telefono: '+54 9 2241 33-7788' },
  },
  {
    nombre: 'Aditivo',
    restante: 780,
    capacidad: 2000,
    unidad: 'kg',
    unidadCompra: 'kg',
    factorConversion: 1,
    consumoDiario: 22,
    medidoPorPlc: true,
    proveedor: { nombre: 'Química del Centro', telefono: '+54 9 2241 15-40-3311' },
  },
  {
    nombre: 'Agua',
    restante: null,
    capacidad: null,
    unidad: 'L',
    unidadCompra: 'L',
    factorConversion: 1,
    consumoDiario: 1400,
    // Sale del pozo: no hay silo que se vacíe ni compra que cargar. El
    // PLC la pesa igual, así que el consumo se conoce — lo que no existe
    // es una existencia que se pueda quebrar.
    medidoPorPlc: true,
    sinStock: true,
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


/**
 * A quién se le compra — apartado 6.
 *
 * Son tres, uno por material, y el agua sale del pozo. Por eso no hay
 * pantalla de Proveedores: cada uno vive adentro de SU material, que es
 * donde sirve tenerlo a mano cuando el silo está por vaciarse (R6 del
 * apartado 6) → decisiones/hormigonera-compras-adentro-de-materiales
 *
 * Los nombres y teléfonos ya estaban en `MATERIALES` desde el 22/08: acá
 * pasan a ser entidades, para que una compra pueda apuntarles.
 */
export const PROVEEDORES: Proveedor[] = [
  {
    id: 'PR-01',
    nombre: 'Cementos Avellaneda',
    telefono: '+54 9 2271 40-2211',
    provee: ['Cemento'],
    activo: true,
  },
  {
    id: 'PR-02',
    nombre: 'Arenera del Salado',
    telefono: '+54 9 2241 33-7788',
    provee: ['Áridos'],
    activo: true,
  },
  {
    id: 'PR-03',
    nombre: 'Química del Centro',
    telefono: '+54 9 2241 15-40-3311',
    provee: ['Aditivo'],
    activo: true,
  },
];

/**
 * El conteo del que arranca todo.
 *
 * R1 del apartado 7: el stock no se declara, se deduce — y las únicas
 * entradas manuales son el STOCK INICIAL y los ajustes. Sin este punto de
 * partida no hay nada que deducir: una resta necesita un cero.
 *
 * Es de hace 45 días para que la ventana de 30 que mira la pantalla caiga
 * entera adentro del período con compras.
 */
export function inventarioInicial(ahora: Date): AjusteStock[] {
  const cuando = new Date(ahora);
  cuando.setDate(cuando.getDate() - 45);
  cuando.setHours(8, 0, 0, 0);

  const arranque: Record<string, number> = {
    Cemento: 42_000,
    'Áridos': 520_000,
    Aditivo: 1_400,
  };

  return Object.entries(arranque).map(([material, declarado]) => ({
    id: `AJ-INI-${material}`,
    material,
    fecha: cuando.toISOString(),
    declarado,
    // El primero no tiene contra qué compararse: no hay cuenta previa.
    // `calculado: 0` lo deja fuera de la merma medida, que es lo correcto
    // — un inventario de arranque no es una diferencia.
    calculado: 0,
    motivo: 'Inventario de arranque',
  }));
}

/**
 * Las compras que repusieron los silos.
 *
 * NO son un guion inventado: se derivan del consumo real de las cargas.
 * Se recorre el período día por día restando lo que se consumió, y cuando
 * la existencia baja del punto de pedido se compra un camión — lo que
 * entre sin pasarse de la capacidad (R6 del apartado 6).
 *
 * El precio de cada compra sale de `costoMaterialEnDia` en la fecha en
 * que se hizo, que es la misma función de la que Rentabilidad saca el
 * costo histórico. Así la última compra y el costo de hoy no se
 * contradicen entre pantallas.
 */
export function generarCompras(ahora: Date, cargas: Carga[]): Compra[] {
  const inicial = inventarioInicial(ahora);
  const compras: Compra[] = [];
  let n = 0;

  for (const ajuste of inicial) {
    const material = MATERIALES.find((m) => m.nombre === ajuste.material);
    const proveedor = PROVEEDORES.find((p) => p.provee.includes(ajuste.material));
    if (!material?.capacidad || !proveedor) continue;

    const factor = material.factorConversion ?? 1;
    /* Se pide en DÍAS y no en porcentaje del silo (R5 del apartado 7).
       Un cuarto de silo son tres semanas de aditivo y un día de cemento:
       el mismo porcentaje significa cosas opuestas según el material. Con
       el camión a 180 km, tres días es el margen para que llegue. */
    const puntoDePedido = material.consumoDiario * 3;

    let quedan = ajuste.declarado;
    const arranque = new Date(ajuste.fecha);

    for (let d = 0; d <= 45; d++) {
      const dia = new Date(arranque);
      dia.setDate(dia.getDate() + d);
      if (dia > ahora) break;

      if (quedan < puntoDePedido) {
        // Entero en unidades de compra: nadie pide 27,4 toneladas.
        const cabe = Math.floor((material.capacidad - quedan) / factor);
        if (cabe > 0) {
          const momento = new Date(dia);
          momento.setHours(9, 30, 0, 0);
          const diasAtras = Math.round(
            (ahora.getTime() - momento.getTime()) / 86_400_000,
          );
          const porUnidadDePlanta = costoMaterialEnDia(material.nombre, diasAtras);
          const precioUnitario = Math.round(porUnidadDePlanta * factor);

          compras.push({
            id: `CP-${String(++n).padStart(4, '0')}`,
            momento: momento.toISOString(),
            proveedorId: proveedor.id,
            material: material.nombre,
            cantidad: cabe,
            unidadCompra: material.unidadCompra ?? material.unidad,
            cantidadConvertida: cabe * factor,
            precioUnitario,
            total: precioUnitario * cabe,
            remito: `R-${String(100_000 + n * 137).slice(0, 6)}`,
          });

          quedan += cabe * factor;
        }
      }

      const delDia = cargas.filter(
        (c) => new Date(c.momento).toDateString() === dia.toDateString(),
      );
      quedan -= consumoDe(material.nombre, delDia);
    }
  }

  return compras.sort((a, b) => a.momento.localeCompare(b.momento));
}
