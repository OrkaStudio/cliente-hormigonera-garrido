import { describe, expect, it } from 'vitest';
import type { Carga, Material } from '@/lib/datos/tipos';
import {
  consumoDe,
  diasQueAguanta,
  mermaMedida,
  nivelDeStock,
  sugerenciaDeCompra,
  cuantoSale,
  proporcionDeDias,
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

function material(p: Partial<Material>): Material {
  return {
    nombre: 'Cemento',
    restante: 38_200,
    capacidad: 50_000,
    unidad: 'kg',
    consumoDiario: 11_955,
    ...p,
  };
}

describe('cuantoSale', () => {
  const silos = [
    material({ nombre: 'Cemento', restante: 38_200 }),
    material({ nombre: 'Áridos', restante: 462_000, capacidad: 600_000 }),
    material({ nombre: 'Aditivo', restante: 780, capacidad: 2_000 }),
    material({ nombre: 'Agua', restante: null, capacidad: null, sinStock: true }),
  ];

  const H30 = {
    codigo: 'H-30',
    dosificacion: [
      { material: 'Cemento', porM3: 350, unidad: 'kg' },
      { material: 'Áridos', porM3: 1_900, unidad: 'kg' },
      { material: 'Agua', porM3: 165, unidad: 'L' },
      { material: 'Aditivo', porM3: 1.8, unidad: 'kg' },
    ],
  };

  it('manda el material que menos da, no el promedio', () => {
    // Sobran áridos para 243 m³ y aditivo para 433, pero el cemento
    // alcanza para 109. Salen 109.
    const r = cuantoSale(H30, silos)!;
    expect(r.m3).toBe(109);
    expect(r.frena).toBe('Cemento');
  });

  it('el agua no frena nada: sale del pozo', () => {
    const r = cuantoSale(H30, silos)!;
    expect(r.porMaterial.map((x) => x.material)).not.toContain('Agua');
  });

  it('un material sin stock deducido tampoco frena', () => {
    const sinDeducir = silos.map((m) =>
      m.nombre === 'Cemento' ? { ...m, restante: null } : m,
    );
    const r = cuantoSale(H30, sinDeducir)!;
    expect(r.frena).not.toBe('Cemento');
  });

  it('sin ningún material medible no inventa un número', () => {
    expect(cuantoSale(H30, [])).toBeNull();
  });

  it('redondea para abajo: no se puede hacer medio pastón de más', () => {
    const r = cuantoSale(
      { codigo: 'X', dosificacion: [{ material: 'Cemento', porM3: 300, unidad: 'kg' }] },
      [material({ restante: 1_000 })],
    )!;
    expect(r.m3).toBe(3);
  });
});

describe('proporcionDeDias', () => {
  it('el que más aguanta llena la barra y el que menos queda corto', () => {
    // Con el llenado del silo pasaba al revés: el aditivo va al 39% de
    // capacidad y es el que MEJOR está.
    expect(proporcionDeDias(13, 13)).toBe(100);
    expect(Math.round(proporcionDeDias(3, 13)!)).toBe(23);
    expect(Math.round(proporcionDeDias(6, 13)!)).toBe(46);
  });

  it('sin días no hay barra', () => {
    expect(proporcionDeDias(null, 13)).toBeNull();
  });

  it('sin máximo con qué comparar tampoco', () => {
    expect(proporcionDeDias(3, 0)).toBeNull();
  });
});
