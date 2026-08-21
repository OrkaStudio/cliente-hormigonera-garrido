import { describe, expect, it } from 'vitest';

import { condicionFiscal, pesosDe, porcentajeFacturado } from './fiscal';

describe('condicionFiscal', () => {
  it('todo facturado es blanco', () => {
    expect(condicionFiscal({ total: 564_000, montoFacturado: 564_000 })).toBe('blanco');
  });

  it('nada facturado es negro', () => {
    expect(condicionFiscal({ total: 564_000, montoFacturado: 0 })).toBe('negro');
  });

  it('una parte es parcial', () => {
    expect(condicionFiscal({ total: 564_000, montoFacturado: 350_000 })).toBe('parcial');
  });

  // El caso que motivo todo el cambio: un booleano no puede decir esto.
  it('un peso menos que el total ya no es blanco', () => {
    expect(condicionFiscal({ total: 564_000, montoFacturado: 563_999 })).toBe('parcial');
  });

  it('sin definir devuelve null, no negro', () => {
    expect(condicionFiscal({ total: 564_000, montoFacturado: null })).toBeNull();
  });

  // Una carga sin cliente vale 0. No es ni blanca ni negra: todavia no
  // es una venta. Sin esta guarda, 0 >= 0 la marcaria como blanco.
  it('sin precio devuelve null aunque el monto sea 0', () => {
    expect(condicionFiscal({ total: 0, montoFacturado: 0 })).toBeNull();
  });

  it('un monto mayor que el total sigue siendo blanco, no rompe', () => {
    expect(condicionFiscal({ total: 100_000, montoFacturado: 120_000 })).toBe('blanco');
  });
});

describe('porcentajeFacturado', () => {
  it('redondea', () => {
    expect(porcentajeFacturado({ total: 564_000, montoFacturado: 350_000 })).toBe(62);
  });

  it('sin definir devuelve null', () => {
    expect(porcentajeFacturado({ total: 564_000, montoFacturado: null })).toBeNull();
  });

  it('no pasa de 100 aunque el monto se haya cargado de mas', () => {
    expect(porcentajeFacturado({ total: 100_000, montoFacturado: 120_000 })).toBe(100);
  });
});

describe('pesosDe', () => {
  it('parte el total en blanco y negro', () => {
    expect(pesosDe({ total: 564_000, montoFacturado: 350_000 })).toEqual({
      blanco: 350_000,
      negro: 214_000,
    });
  });

  it('los dos lados siempre suman el total', () => {
    for (const monto of [0, 1, 350_000, 563_999, 564_000]) {
      const p = pesosDe({ total: 564_000, montoFacturado: monto })!;
      expect(p.blanco + p.negro).toBe(564_000);
    }
  });

  // Un monto cargado de mas no puede inventar facturacion ni hacer que
  // el negro de negativo. Se acota contra el total.
  it('acota el excedente en vez de dar negro negativo', () => {
    expect(pesosDe({ total: 100_000, montoFacturado: 120_000 })).toEqual({
      blanco: 100_000,
      negro: 0,
    });
  });

  it('sin definir devuelve null', () => {
    expect(pesosDe({ total: 564_000, montoFacturado: null })).toBeNull();
  });
});
