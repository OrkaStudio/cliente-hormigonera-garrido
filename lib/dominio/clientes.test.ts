import { describe, expect, it } from 'vitest';

import type { Carga, Cliente } from '@/lib/datos/tipos';
import {
  coincide,
  diasSinComprar,
  ordenarPorActividad,
  ordenarRanking,
  participacion,
  porcentajeEnBlanco,
  resumenDeCliente,
  temperatura,
  type ClienteConResumen,
} from './clientes';

function carga(p: Partial<Carga>): Carga {
  return {
    id: 'C-1',
    momento: '2026-08-20T10:00:00.000Z',
    receta: 'H-21',
    m3: 7,
    clienteId: 'CL-01',
    estado: 'asignada',
    montoFacturado: 100_000,
    total: 100_000,
    pesadas: [],
    ...p,
  };
}

function cliente(p: Partial<Cliente>): Cliente {
  return {
    id: 'CL-01',
    nombre: 'Constructora del Este SRL',
    contacto: null,
    telefono: null,
    mail: null,
    direccion: null,
    cuit: null,
    notas: null,
    activo: true,
    generico: false,
    ...p,
  };
}

describe('resumenDeCliente', () => {
  it('suma sólo las cargas de ese cliente', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', clienteId: 'CL-01', m3: 7, total: 100 }),
      carga({ id: 'b', clienteId: 'CL-02', m3: 6, total: 200 }),
    ]);

    expect(r.ventas).toBe(1);
    expect(r.m3).toBe(7);
    expect(r.facturado).toBe(100);
  });

  // R3 — una carga sin cliente no le suma a nadie.
  it('no le adjudica a nadie una carga sin asignar', () => {
    const r = resumenDeCliente('CL-01', [carga({ clienteId: null, total: 999 })]);
    expect(r.ventas).toBe(0);
    expect(r.facturado).toBe(0);
  });

  // Una carga abortada no es una venta: sumarla infla los m³ de alguien
  // que nunca los recibió.
  it('deja afuera las anuladas', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', estado: 'facturada', m3: 7 }),
      carga({ id: 'b', estado: 'anulada', m3: 6 }),
    ]);

    expect(r.ventas).toBe(1);
    expect(r.m3).toBe(7);
  });

  it('toma la última compra por fecha, no por orden de llegada', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', momento: '2026-08-20T10:00:00.000Z' }),
      carga({ id: 'b', momento: '2026-08-14T10:00:00.000Z' }),
      carga({ id: 'c', momento: '2026-08-18T10:00:00.000Z' }),
    ]);

    expect(r.ultimaCompra).toBe('2026-08-20T10:00:00.000Z');
  });

  it('la receta frecuente es la más repetida', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', receta: 'H-30' }),
      carga({ id: 'b', receta: 'H-21' }),
      carga({ id: 'c', receta: 'H-21' }),
    ]);

    expect(r.recetaFrecuente).toBe('H-21');
  });

  it('desempata igual siempre, sin depender del orden de las cargas', () => {
    const unas = [carga({ id: 'a', receta: 'H-30' }), carga({ id: 'b', receta: 'H-21' })];
    const otras = [...unas].reverse();

    expect(resumenDeCliente('CL-01', unas).recetaFrecuente).toBe(
      resumenDeCliente('CL-01', otras).recetaFrecuente,
    );
  });

  it('un cliente sin cargas da todo en cero y sin fecha', () => {
    const r = resumenDeCliente('CL-09', [carga({})]);
    expect(r).toEqual({
      ventas: 0,
      m3: 0,
      facturado: 0,
      ultimaCompra: null,
      recetaFrecuente: null,
      blanco: 0,
      negro: 0,
      definidas: 0,
    });
  });
});

describe('porcentajeEnBlanco', () => {
  it('calcula sobre los pesos de las ventas definidas', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', montoFacturado: 100_000 }),
      carga({ id: 'b', montoFacturado: 100_000 }),
      carga({ id: 'c', montoFacturado: 0 }),
    ]);

    expect(porcentajeEnBlanco(r)).toBe(67);
  });

  // El motivo de medir en pesos y no en cantidad: contando ventas esto
  // daria 50%, cuando en plata el blanco es apenas el 8%.
  it('una venta grande en negro pesa mas que una chica en blanco', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', total: 100_000, montoFacturado: 100_000 }),
      carga({ id: 'b', total: 1_100_000, montoFacturado: 0 }),
    ]);

    expect(porcentajeEnBlanco(r)).toBe(8);
  });

  it('la parte facturada de una venta parcial cae de los dos lados', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', total: 100_000, montoFacturado: 40_000 }),
    ]);

    expect(r.blanco).toBe(40_000);
    expect(r.negro).toBe(60_000);
    expect(porcentajeEnBlanco(r)).toBe(40);
  });

  // Sin esto, "todavía no se definió" se leería como "le vende todo en
  // negro", que es afirmar algo que nadie dijo.
  it('devuelve null cuando no hay ninguna definida, no 0', () => {
    const r = resumenDeCliente('CL-01', [carga({ montoFacturado: null })]);
    expect(porcentajeEnBlanco(r)).toBeNull();
  });

  it('no cuenta las sin definir en el denominador', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', montoFacturado: 100_000 }),
      carga({ id: 'b', montoFacturado: null }),
    ]);

    expect(porcentajeEnBlanco(r)).toBe(100);
    expect(r.definidas).toBe(1);
  });
});

describe('ordenarPorActividad', () => {
  const con = (id: string, nombre: string, ultimaCompra: string | null): ClienteConResumen => ({
    ...cliente({ id, nombre }),
    resumen: {
      ventas: 0,
      m3: 0,
      facturado: 0,
      ultimaCompra,
      recetaFrecuente: null,
      blanco: 0,
      negro: 0,
      definidas: 0,
    },
  });

  it('pone primero al que compró más recientemente', () => {
    const orden = ordenarPorActividad([
      con('CL-01', 'Viejo', '2026-01-10T10:00:00.000Z'),
      con('CL-02', 'Reciente', '2026-08-19T10:00:00.000Z'),
    ]);

    expect(orden.map((c) => c.id)).toEqual(['CL-02', 'CL-01']);
  });

  it('manda al final a los que nunca compraron', () => {
    const orden = ordenarPorActividad([
      con('CL-01', 'Nunca', null),
      con('CL-02', 'Compró', '2026-01-10T10:00:00.000Z'),
    ]);

    expect(orden.map((c) => c.id)).toEqual(['CL-02', 'CL-01']);
  });

  it('no muta el arreglo que recibe', () => {
    const original = [
      con('CL-01', 'Viejo', '2026-01-10T10:00:00.000Z'),
      con('CL-02', 'Reciente', '2026-08-19T10:00:00.000Z'),
    ];
    ordenarPorActividad(original);

    expect(original.map((c) => c.id)).toEqual(['CL-01', 'CL-02']);
  });
});

describe('coincide', () => {
  const corralon = cliente({
    nombre: 'Corralón El Ladrillo',
    contacto: 'Rubén Ibáñez',
    cuit: '20-16884203-4',
  });

  // Nadie va a tipear el tilde para encontrar el corralón.
  it('encuentra sin acentos', () => {
    expect(coincide(corralon, 'corralon')).toBe(true);
  });

  it('encuentra con acentos igual', () => {
    expect(coincide(corralon, 'Corralón')).toBe(true);
  });

  it('busca también por contacto y por CUIT', () => {
    expect(coincide(corralon, 'ruben')).toBe(true);
    expect(coincide(corralon, '16884203')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincide(corralon, '   ')).toBe(true);
  });

  it('no inventa coincidencias', () => {
    expect(coincide(corralon, 'riquelme')).toBe(false);
  });
});

function conResumen(
  id: string,
  nombre: string,
  m3: number,
  facturado: number,
  generico = false,
): ClienteConResumen {
  return {
    ...cliente({ id, nombre, generico }),
    resumen: {
      ventas: 1,
      m3,
      facturado,
      ultimaCompra: '2026-08-20T10:00:00.000Z',
      recetaFrecuente: 'H-21',
      blanco: 0,
      negro: 0,
      definidas: 0,
    },
  };
}

describe('diasSinComprar', () => {
  it('cuenta contra el arranque del día, no contra la hora', () => {
    // Compró anoche tarde y se lo mira temprano: sigue siendo ayer.
    const dias = diasSinComprar(
      '2026-08-23T23:00:00.000Z',
      new Date('2026-08-24T07:00:00.000Z'),
    );
    expect(dias).toBe(1);
  });

  it('el mismo día da cero', () => {
    expect(
      diasSinComprar('2026-08-24T08:00:00.000Z', new Date('2026-08-24T20:00:00.000Z')),
    ).toBe(0);
  });

  it('nunca compró no es lo mismo que hace mucho', () => {
    expect(diasSinComprar(null)).toBeNull();
  });

  it('no devuelve negativos si el reloj viene corrido', () => {
    expect(
      diasSinComprar('2026-08-25T10:00:00.000Z', new Date('2026-08-24T10:00:00.000Z')),
    ).toBe(0);
  });
});

describe('temperatura', () => {
  it('una compra de esta semana no enciende ningún color', () => {
    expect(temperatura(0)).toBe('fresco');
    expect(temperatura(5)).toBe('fresco');
    expect(temperatura(20)).toBe('fresco');
  });

  it('a las tres semanas empieza a llamar la atención', () => {
    expect(temperatura(21)).toBe('tibio');
    expect(temperatura(44)).toBe('tibio');
  });

  it('a los cuarenta y cinco días es una alarma', () => {
    expect(temperatura(45)).toBe('frio');
    expect(temperatura(200)).toBe('frio');
  });

  it('sin compras no hay temperatura', () => {
    expect(temperatura(null)).toBeNull();
  });
});

describe('participacion', () => {
  it('mide contra el total de la planta, no contra el más grande', () => {
    expect(Math.round(participacion(706, 3772))).toBe(19);
  });

  it('sin producción no divide por cero', () => {
    expect(participacion(0, 0)).toBe(0);
  });
});

describe('ordenarRanking', () => {
  const todos = [
    conResumen('CL-01', 'Constructora del Este SRL', 606, 52_662_905),
    conResumen('CL-02', 'Corralón El Ladrillo', 605, 52_960_737),
    conResumen('CL-03', 'Obras Monte SA', 706, 61_236_771),
    conResumen('CL-99', 'Mostrador', 592, 51_326_264, true),
  ];

  it('los dos criterios NO dan el mismo orden', () => {
    // Corralón lleva un m³ menos que Constructora y factura más: compra
    // recetas más caras. Si el orden fuera uno solo, eso no se ve.
    const porVolumen = ordenarRanking(todos, 'volumen').ranking.map((c) => c.id);
    const porFacturado = ordenarRanking(todos, 'facturado').ranking.map((c) => c.id);

    expect(porVolumen).toEqual(['CL-03', 'CL-01', 'CL-02']);
    expect(porFacturado).toEqual(['CL-03', 'CL-02', 'CL-01']);
  });

  it('la venta suelta queda afuera del ranking', () => {
    const { ranking, genericos } = ordenarRanking(todos, 'volumen');

    expect(ranking.some((c) => c.generico)).toBe(false);
    expect(genericos.map((c) => c.nombre)).toEqual(['Mostrador']);
  });

  it('empate de números se rompe por nombre, no por orden de llegada', () => {
    const empatados = [
      conResumen('CL-B', 'Zeta SA', 100, 100),
      conResumen('CL-A', 'Alfa SA', 100, 100),
    ];
    expect(ordenarRanking(empatados, 'volumen').ranking.map((c) => c.nombre)).toEqual([
      'Alfa SA',
      'Zeta SA',
    ]);
  });
});
