import { describe, expect, it } from 'vitest';
import type { Carga } from '@/lib/datos/tipos';
import {
  carreraDePrecios,
  costoDeCarga,
  margenDespuesDeFijos,
  resumirPeriodo,
  variacion,
} from './rentabilidad';

const COSTOS: Record<string, number> = { Cemento: 200, Arena: 10, Piedra: 15 };
const costoDe = (m: string) => COSTOS[m] ?? null;

function carga(over: Partial<Carga> = {}): Carga {
  return {
    id: 'C-1',
    momento: '2026-08-01T10:00:00.000Z',
    receta: 'H-21',
    m3: 6,
    clienteId: 'CL-01',
    estado: 'facturada',
    total: 600_000,
    montoFacturado: 600_000,
    pesadas: [
      { material: 'Cemento', receta: 2000, objetivo: 2000, real: 2000 },
      { material: 'Arena', receta: 4000, objetivo: 4000, real: 4000 },
      { material: 'Piedra', receta: 6000, objetivo: 6000, real: 6000 },
    ],
    ...over,
  };
}

describe('costoDeCarga', () => {
  it('cuesta lo que la balanza peso de verdad, no lo que pedia la receta', () => {
    // Si la balanza tira 10% de cemento de mas, esa plata salio del
    // bolsillo aunque la receta dijera otra cosa.
    const normal = costoDeCarga(carga(), costoDe);
    const conDesvio = costoDeCarga(
      carga({
        pesadas: [
          { material: 'Cemento', receta: 2000, objetivo: 2000, real: 2200 },
          { material: 'Arena', receta: 4000, objetivo: 4000, real: 4000 },
          { material: 'Piedra', receta: 6000, objetivo: 6000, real: 6000 },
        ],
      }),
      costoDe,
    );
    expect(conDesvio.costo - normal.costo).toBe(200 * 200);
    expect(conDesvio.margen).toBeLessThan(normal.margen);
  });

  it('avisa cuando falta el costo de un material en vez de contarlo como cero (R6)', () => {
    const r = costoDeCarga(carga(), (m) => (m === 'Piedra' ? null : COSTOS[m]!));
    expect(r.incompleto).toBe(true);
    // Sin la piedra el margen sale inflado: por eso hay que decirlo.
    expect(r.porMaterial).toHaveLength(2);
  });

  it('una carga sin facturar no rompe el porcentaje', () => {
    const r = costoDeCarga(carga({ total: 0 }), costoDe);
    expect(r.margenPct).toBe(0);
    expect(Number.isNaN(r.margenPct)).toBe(false);
  });
});

describe('resumirPeriodo', () => {
  it('promedia por m3, no por carga', () => {
    // Dos cargas de distinto tamaño: el precio por m3 tiene que ser
    // ponderado, no el promedio simple de los dos precios.
    const r = resumirPeriodo([carga({ m3: 6 }), carga({ id: 'C-2', m3: 10, total: 1_000_000 })], costoDe);
    expect(r.m3).toBe(16);
    expect(r.facturado).toBe(1_600_000);
    expect(r.precioPorM3).toBe(100_000);
  });

  it('sin cargas devuelve ceros y no NaN', () => {
    const r = resumirPeriodo([], costoDe);
    expect(r.margenPct).toBe(0);
    expect(r.precioPorM3).toBe(0);
  });
});

describe('margenDespuesDeFijos', () => {
  it('no inventa un margen si Jose no cargo los fijos', () => {
    expect(margenDespuesDeFijos(1_000_000, [])).toBeNull();
  });

  it('prorratea los fijos por la parte del mes que se esta mirando', () => {
    const fijos = [{ id: '1', nombre: 'Sueldos', mensual: 3_000_000 }];
    const medio = margenDespuesDeFijos(2_000_000, fijos, 0.5);
    expect(medio?.fijos).toBe(1_500_000);
    expect(medio?.resultado).toBe(500_000);
  });

  it('deja ver el resultado negativo en vez de recortarlo en cero', () => {
    const r = margenDespuesDeFijos(1_000_000, [{ id: '1', nombre: 'Sueldos', mensual: 4_000_000 }]);
    expect(r?.resultado).toBe(-3_000_000);
  });
});

describe('variacion', () => {
  it('mide el cambio contra el periodo anterior', () => {
    expect(variacion(110, 100)).toBeCloseTo(10);
    expect(variacion(90, 100)).toBeCloseTo(-10);
  });

  it('no divide por cero cuando no hay periodo anterior', () => {
    expect(variacion(100, 0)).toBeNull();
  });
});

describe('carreraDePrecios', () => {
  const base = (precio: number, costo: number) =>
    resumirPeriodo(
      [carga({ m3: 1, total: precio, pesadas: [{ material: 'Cemento', receta: 1, objetivo: 1, real: costo / 200 }] })],
      costoDe,
    );

  it('avisa cuando el costo sube mas rapido que el precio', () => {
    // Facturar mas que el mes pasado no significa nada si el costo subio
    // mas: el margen se achica igual.
    const r = carreraDePrecios(base(104, 110), base(100, 100));
    expect(r?.gana).toBe(false);
    expect(r!.costo).toBeGreaterThan(r!.precio);
  });

  it('reconoce cuando el precio le gana al costo', () => {
    const r = carreraDePrecios(base(112, 105), base(100, 100));
    expect(r?.gana).toBe(true);
  });
});
