import { describe, expect, it } from 'vitest';

import type { Carga } from '@/lib/datos/tipos';
import {
  agruparPorDia,
  coincideCarga,
  colorDeReceta,
  diaLocal,
  mezclaPorReceta,
  resumirCargas,
} from './cargas';

const RECETAS = ['H-21', 'H-25', 'H-30'];

function carga(p: Partial<Carga>): Carga {
  return {
    id: 'C-1595',
    momento: '2026-08-24T19:28:00.000Z',
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

describe('colorDeReceta', () => {
  it('asigna en orden fijo y no cicla', () => {
    expect(colorDeReceta('H-21', RECETAS)).toBe('s1');
    expect(colorDeReceta('H-25', RECETAS)).toBe('s2');
    expect(colorDeReceta('H-30', RECETAS)).toBe('s3');
  });

  it('una quinta receta va sin color antes que repetir uno', () => {
    const cinco = ['a', 'b', 'c', 'd', 'e'];
    expect(colorDeReceta('d', cinco)).toBe('s4');
    expect(colorDeReceta('e', cinco)).toBeNull();
  });

  it('una receta que no está en la lista no inventa color', () => {
    expect(colorDeReceta('H-99', RECETAS)).toBeNull();
  });
});

describe('mezclaPorReceta', () => {
  const hoy = [
    carga({ id: 'a', receta: 'H-21', m3: 7 }),
    carga({ id: 'b', receta: 'H-25', m3: 6 }),
    carga({ id: 'c', receta: 'H-25', m3: 6 }),
    carga({ id: 'd', receta: 'H-25', m3: 6 }),
    carga({ id: 'e', receta: 'H-25', m3: 6 }),
  ];

  it('suma el volumen de cada receta y saca su porción', () => {
    const m = mezclaPorReceta(hoy);
    expect(m).toEqual([
      { receta: 'H-25', m3: 24, pct: (24 / 31) * 100 },
      { receta: 'H-21', m3: 7, pct: (7 / 31) * 100 },
    ]);
  });

  it('ordena por volumen, no alfabéticamente: la que manda va primero', () => {
    expect(mezclaPorReceta(hoy)[0]!.receta).toBe('H-25');
  });

  it('las porciones suman cien', () => {
    const total = mezclaPorReceta(hoy).reduce((a, p) => a + p.pct, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('sin cargas no divide por cero', () => {
    expect(mezclaPorReceta([])).toEqual([]);
  });
});

describe('resumirCargas', () => {
  it('una carga sin corte definido no cuenta como negro', () => {
    // Sin cliente: total 0 y sin monto facturado. Contarla como negro
    // sería afirmar algo que nadie dijo.
    const r = resumirCargas([
      carga({ id: 'a', total: 100, montoFacturado: 100 }),
      carga({ id: 'b', total: 0, montoFacturado: null, clienteId: null, estado: 'registrada' }),
    ]);

    expect(r.cargas).toBe(2);
    expect(r.blanco).toBe(100);
    expect(r.negro).toBe(0);
    expect(r.pctBlanco).toBe(100);
  });

  it('sin nada definido devuelve null, no cero', () => {
    const r = resumirCargas([
      carga({ total: 0, montoFacturado: null, clienteId: null, estado: 'registrada' }),
    ]);
    expect(r.pctBlanco).toBeNull();
  });

  it('parte los pesos de una venta facturada a medias', () => {
    const r = resumirCargas([carga({ total: 1000, montoFacturado: 530 })]);
    expect(r.blanco).toBe(530);
    expect(r.negro).toBe(470);
    expect(r.pctBlanco).toBe(53);
  });
});

describe('agruparPorDia', () => {
  const historial = [
    carga({ id: 'C-1590', momento: '2026-08-22T11:45:00.000Z', m3: 7, total: 621_453 }),
    carga({ id: 'C-1589', momento: '2026-08-22T09:38:00.000Z', m3: 7, total: 621_453 }),
    carga({ id: 'C-1583', momento: '2026-08-21T07:44:00.000Z', m3: 6, total: 561_900 }),
  ];

  it('agrupa por día y ordena del más reciente al más viejo', () => {
    expect(agruparPorDia(historial).map((d) => d.dia)).toEqual(['2026-08-22', '2026-08-21']);
  });

  it('cada día trae su propio resumen', () => {
    const [veintidos] = agruparPorDia(historial);
    expect(veintidos!.resumen.cargas).toBe(2);
    expect(veintidos!.resumen.m3).toBe(14);
    expect(veintidos!.resumen.facturado).toBe(1_242_906);
  });

  it('sin cargas devuelve una lista vacía', () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});

describe('coincideCarga', () => {
  const c = carga({ id: 'C-1595', receta: 'H-21' });

  it('encuentra sin el guión y sin mayúsculas', () => {
    expect(coincideCarga(c, 'c1595')).toBe(true);
    expect(coincideCarga(c, 'C-1595')).toBe(true);
    expect(coincideCarga(c, '1595')).toBe(true);
  });

  it('también busca por receta', () => {
    expect(coincideCarga(c, 'h21')).toBe(true);
    expect(coincideCarga(c, 'H-21')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincideCarga(c, '  ')).toBe(true);
  });

  it('lo que no coincide, no coincide', () => {
    expect(coincideCarga(c, 'C-1420')).toBe(false);
  });
});

describe('diaLocal', () => {
  it('agrupa por el día de la planta, no por el de UTC', () => {
    // 21:52 del 20/8 en Buenos Aires es 00:52 del 21/8 en UTC. Cortar el
    // ISO metía esa carga en el día siguiente, y el resumen del día
    // contaba una carga que no fue.
    const nocheDel20 = new Date(2026, 7, 20, 21, 52).toISOString();
    expect(diaLocal(nocheDel20)).toBe('2026-08-20');
  });

  it('la primera hora del día también cae donde corresponde', () => {
    const madrugadaDel21 = new Date(2026, 7, 21, 0, 30).toISOString();
    expect(diaLocal(madrugadaDel21)).toBe('2026-08-21');
  });

  it('agruparPorDia usa el día local', () => {
    const cargas = [
      carga({ id: 'a', momento: new Date(2026, 7, 20, 21, 52).toISOString() }),
      carga({ id: 'b', momento: new Date(2026, 7, 20, 9, 10).toISOString() }),
    ];
    const dias = agruparPorDia(cargas);
    expect(dias).toHaveLength(1);
    expect(dias[0]!.dia).toBe('2026-08-20');
  });
});
