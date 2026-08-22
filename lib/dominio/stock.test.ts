import { describe, expect, it } from 'vitest';
import type { Carga, Material } from '@/lib/datos/tipos';
import {
  consumoDe,
  diasQueAguanta,
  mermaMedida,
  nivelDeStock,
  sugerenciaDeCompra,
} from './stock';

const cemento: Material = {
  nombre: 'Cemento',
  restante: 12_400,
  capacidad: 50_000,
  unidad: 'kg',
  unidadCompra: 't',
  factorConversion: 1000,
  consumoDiario: 4100,
};

function carga(real: number, estado: Carga['estado'] = 'facturada'): Carga {
  return {
    id: 'C-1',
    momento: '2026-08-21T10:00:00.000Z',
    receta: 'H-21',
    m3: 6,
    clienteId: 'CL-01',
    estado,
    total: 500_000,
    montoFacturado: null,
    pesadas: [{ material: 'Cemento', receta: real, objetivo: real, real }],
  };
}

describe('consumoDe', () => {
  it('suma el peso REAL, no el objetivo', () => {
    expect(consumoDe('Cemento', [carga(2000), carga(2100)])).toBe(4100);
  });

  it('una carga anulada descuenta igual (R2)', () => {
    // El cemento se uso aunque la venta no exista. Si no descontara, el
    // stock mentiria justo cuando mas importa.
    expect(consumoDe('Cemento', [carga(2000, 'anulada')])).toBe(2000);
  });

  it('ignora los materiales que esa carga no llevo', () => {
    expect(consumoDe('Aditivo', [carga(2000)])).toBe(0);
  });
});

describe('diasQueAguanta', () => {
  it('redondea para abajo: quedarse corto avisa antes', () => {
    expect(diasQueAguanta(12_400, 4100)).toBe(3);
  });

  it('sin consumo no inventa un plazo', () => {
    expect(diasQueAguanta(12_400, 0)).toBeNull();
  });
});

describe('nivelDeStock', () => {
  it('sin dato no es lo mismo que estar bien (R7)', () => {
    expect(nivelDeStock(null, 5)).toBe('sin-dato');
  });

  it('un dia o menos ya es quiebre', () => {
    expect(nivelDeStock(1, 5)).toBe('quiebre');
    expect(nivelDeStock(4, 5)).toBe('bajo');
    expect(nivelDeStock(9, 5)).toBe('ok');
  });
});

describe('sugerenciaDeCompra', () => {
  it('respeta la capacidad del silo (R6)', () => {
    // Entran 50 t y hay 12,4: se pide lo que falta, no mas.
    expect(sugerenciaDeCompra(cemento)).toEqual({ cantidad: 37, unidad: 't' });
  });

  it('devuelve la unidad en que se COMPRA, no en la que se pesa', () => {
    // Nadie le pide 37.600 kg al proveedor: le pide 37 toneladas.
    expect(sugerenciaDeCompra(cemento)?.unidad).toBe('t');
  });

  it('no sugiere nada si el silo esta lleno', () => {
    expect(sugerenciaDeCompra({ ...cemento, restante: 50_000 })).toBeNull();
  });

  it('el agua no se compra', () => {
    expect(
      sugerenciaDeCompra({ ...cemento, nombre: 'Agua', sinStock: true, restante: null, capacidad: null }),
    ).toBeNull();
  });
});

describe('mermaMedida', () => {
  it('mide lo que falto de verdad, no una constante de manual (R4)', () => {
    const m = mermaMedida([
      { id: '1', material: 'Cemento', fecha: '2026-07-01', declarado: 9700, calculado: 10_000 },
      { id: '2', material: 'Cemento', fecha: '2026-08-01', declarado: 7800, calculado: 8000 },
    ]);
    // 300 + 200 perdidos sobre 18.000 de base
    expect(m?.pct).toBeCloseTo(2.78, 1);
    expect(m?.sobre).toBe(2);
  });

  it('sin ajustes no hay merma que informar', () => {
    expect(mermaMedida([])).toBeNull();
  });

  it('si sobro material no cuenta como merma negativa', () => {
    const m = mermaMedida([
      { id: '1', material: 'Cemento', fecha: '2026-07-01', declarado: 10_500, calculado: 10_000 },
    ]);
    expect(m?.pct).toBe(0);
  });
});
