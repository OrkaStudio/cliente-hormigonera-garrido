import { describe, expect, it } from 'vitest';

import type { Carga, Compra } from '@/lib/datos/tipos';
import type { AjusteStock } from './stock';
import { costoDeReposicion, stockDeducido, ultimaCompra } from './compras';

const CEMENTO = { nombre: 'Cemento', sinStock: false };

function ajuste(p: Partial<AjusteStock> = {}): AjusteStock {
  return {
    id: 'AJ-1',
    material: 'Cemento',
    fecha: '2026-08-01T08:00:00.000Z',
    declarado: 40_000,
    calculado: 0,
    ...p,
  };
}

function compra(p: Partial<Compra> = {}): Compra {
  return {
    id: 'CP-0001',
    momento: '2026-08-10T09:30:00.000Z',
    proveedorId: 'PR-01',
    material: 'Cemento',
    cantidad: 30,
    unidadCompra: 't',
    cantidadConvertida: 30_000,
    precioUnitario: 120_000,
    total: 3_600_000,
    remito: 'R-100137',
    ...p,
  };
}

function carga(kg: number, momento = '2026-08-15T10:00:00.000Z'): Carga {
  return {
    id: 'C-1',
    momento,
    receta: 'H-21',
    m3: 7,
    clienteId: 'CL-01',
    estado: 'asignada',
    montoFacturado: null,
    total: 0,
    pesadas: [{ material: 'Cemento', objetivo: kg, real: kg }],
  } as Carga;
}

describe('stockDeducido', () => {
  it('resta: último conteo + lo que entró − lo que se consumió', () => {
    const d = stockDeducido(CEMENTO, [compra()], [carga(12_000)], [ajuste()]);

    expect(d.partida).toBe(40_000);
    expect(d.entradas).toBe(30_000);
    expect(d.consumo).toBe(12_000);
    expect(d.restante).toBe(58_000);
    expect(d.hayDato).toBe(true);
  });

  it('sin ajuste no hay de dónde deducir: lo dice, no inventa un número', () => {
    // R7 — "mejor un sin dato honesto que un número inventado".
    const d = stockDeducido(CEMENTO, [compra()], [carga(12_000)], []);
    expect(d.hayDato).toBe(false);
    expect(d.restante).toBeNull();
  });

  it('el agua no tiene existencia que cuidar', () => {
    const d = stockDeducido({ nombre: 'Agua', sinStock: true }, [], [], [ajuste()]);
    expect(d.hayDato).toBe(false);
  });

  it('cuenta desde el ÚLTIMO ajuste, no desde el primero', () => {
    // Recalibrar a ojo mueve el punto de partida: lo anterior ya está
    // contado adentro del número que alguien declaró.
    const d = stockDeducido(
      CEMENTO,
      [compra({ momento: '2026-08-05T09:30:00.000Z' })],
      [],
      [ajuste(), ajuste({ id: 'AJ-2', fecha: '2026-08-20T08:00:00.000Z', declarado: 15_000 })],
    );

    expect(d.partida).toBe(15_000);
    expect(d.entradas).toBe(0);
    expect(d.restante).toBe(15_000);
  });

  it('una compra anulada no suma stock', () => {
    // R5 del apartado 6: anular revierte.
    const d = stockDeducido(CEMENTO, [compra({ anulada: true })], [], [ajuste()]);
    expect(d.entradas).toBe(0);
    expect(d.restante).toBe(40_000);
  });

  it('una carga anulada descuenta igual: el cemento se usó', () => {
    // R2 del apartado 7.
    const anulada = { ...carga(12_000), estado: 'anulada' as const };
    const d = stockDeducido(CEMENTO, [], [anulada], [ajuste()]);
    expect(d.consumo).toBe(12_000);
    expect(d.restante).toBe(28_000);
  });

  it('no cuenta lo de otro material', () => {
    const d = stockDeducido(
      CEMENTO,
      [compra({ material: 'Áridos', cantidadConvertida: 500_000 })],
      [],
      [ajuste()],
    );
    expect(d.entradas).toBe(0);
  });

  it('nunca da negativo: un silo no debe material', () => {
    const d = stockDeducido(CEMENTO, [], [carga(99_000)], [ajuste()]);
    expect(d.restante).toBe(0);
  });
});

describe('costoDeReposicion', () => {
  it('sale de la última compra y por unidad de PLANTA, no de compra', () => {
    // El remito dice $/tonelada; el stock se cuenta en kilos.
    const r = costoDeReposicion('Cemento', [compra()], 1000);
    expect(r?.costo).toBe(120);
    expect(r?.momento).toBe('2026-08-10T09:30:00.000Z');
  });

  it('es la ÚLTIMA, no un promedio (R2 del apartado 6)', () => {
    const r = costoDeReposicion(
      'Cemento',
      [compra(), compra({ id: 'CP-2', momento: '2026-08-20T09:30:00.000Z', precioUnitario: 140_000 })],
      1000,
    );
    expect(r?.costo).toBe(140);
  });

  it('sin compras devuelve null, para que la pantalla lo diga', () => {
    expect(costoDeReposicion('Cemento', [], 1000)).toBeNull();
  });
});

describe('ultimaCompra', () => {
  it('la más nueva que no esté anulada', () => {
    const vieja = compra();
    const anulada = compra({ id: 'CP-9', momento: '2026-08-25T09:30:00.000Z', anulada: true });
    expect(ultimaCompra('Cemento', [vieja, anulada])?.id).toBe('CP-0001');
  });
});
