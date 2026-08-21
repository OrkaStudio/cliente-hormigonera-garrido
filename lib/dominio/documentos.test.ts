import { describe, expect, it } from 'vitest';

import {
  correlativoDe,
  formatearNumero,
  llevaValores,
  totalDe,
  type LineaDocumento,
} from './documentos';

const linea = (cantidad: number, precioUnitario: number | null): LineaDocumento => ({
  detalle: 'Hormigón elaborado H-21',
  cantidad,
  unidad: 'm³',
  precioUnitario,
});

describe('formatearNumero', () => {
  it('arma el numero como se lee en cualquier comprobante', () => {
    expect(formatearNumero(1, 42)).toBe('0001-00000042');
  });

  it('no se rompe cuando el correlativo crece', () => {
    expect(formatearNumero(1, 123_456_789)).toBe('0001-123456789');
  });

  it('correlativoDe es la vuelta de formatearNumero', () => {
    expect(correlativoDe(formatearNumero(1, 7))).toBe(7);
  });

  // Si esto devolviera NaN, `proximoNumero` haria Math.max(0, NaN) = NaN
  // y el siguiente documento saldria sin numero.
  it('correlativoDe devuelve 0 ante basura, no NaN', () => {
    expect(correlativoDe('cualquier cosa')).toBe(0);
    expect(correlativoDe('')).toBe(0);
  });
});

describe('totalDe', () => {
  it('suma cantidad por precio', () => {
    expect(totalDe({ lineas: [linea(6, 94_000), linea(1, 40_000)] })).toBe(604_000);
  });

  // El remito de entrega no tiene total: no es que valga cero, es que en
  // esa hoja no hay precios. Un "$ 0" impreso seria una afirmacion falsa.
  it('sin ningun precio devuelve null, no cero', () => {
    expect(totalDe({ lineas: [linea(6, null)] })).toBeNull();
  });

  it('con una sola linea valorizada ya hay total', () => {
    expect(totalDe({ lineas: [linea(6, null), linea(2, 50_000)] })).toBe(100_000);
  });
});

describe('llevaValores', () => {
  it('el remito de entrega es el unico sin valores', () => {
    expect(llevaValores('presupuesto')).toBe(true);
    expect(llevaValores('remito')).toBe(true);
    expect(llevaValores('remito-sin-valores')).toBe(false);
  });
});
