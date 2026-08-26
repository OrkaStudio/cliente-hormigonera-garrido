import { describe, expect, it } from 'vitest';

import type { Carga, Pedido } from '@/lib/datos/tipos';
import { avanceDe, candidatosPara, coincidePedido, estadoDe } from './pedidos';

function pedido(p: Partial<Pedido> = {}): Pedido {
  return {
    id: 'P-0001',
    clienteId: 'CL-01',
    receta: 'H-21',
    m3: 21,
    precioM3: 89_000,
    creado: '2026-08-26T08:00:00.000Z',
    estado: 'abierto',
    ...p,
  };
}

function carga(p: Partial<Carga> = {}): Carga {
  return {
    id: 'C-1595',
    momento: '2026-08-26T10:00:00.000Z',
    receta: 'H-21',
    m3: 7,
    clienteId: 'CL-01',
    estado: 'asignada',
    montoFacturado: null,
    total: 0,
    pesadas: [],
    ...p,
  };
}

describe('avanceDe', () => {
  const p = pedido({ m3: 21 });
  const tres = [
    carga({ id: 'a', pedidoId: 'P-0001', m3: 7 }),
    carga({ id: 'b', pedidoId: 'P-0001', m3: 7 }),
    carga({ id: 'c', pedidoId: 'P-0001', m3: 7 }),
  ];

  it('suma los pastones imputados, no todas las cargas', () => {
    const otras = [...tres, carga({ id: 'd', pedidoId: 'P-0002', m3: 7 })];
    expect(avanceDe(p, otras).producido).toBe(21);
  });

  it('un pedido cubierto no queda con pendiente', () => {
    const a = avanceDe(p, tres);
    expect(a.pendiente).toBe(0);
    expect(a.pct).toBe(100);
  });

  it('cuenta lo que falta cuando salió sólo una parte', () => {
    const a = avanceDe(p, tres.slice(0, 2));
    expect(a.producido).toBe(14);
    expect(a.pendiente).toBe(7);
  });

  it('una carga anulada NO cuenta para el avance: el pedido sigue necesitando ese volumen', () => {
    const conAnulada = [
      carga({ id: 'a', pedidoId: 'P-0001', m3: 7 }),
      carga({ id: 'b', pedidoId: 'P-0001', m3: 7, estado: 'anulada' }),
    ];
    expect(avanceDe(p, conAnulada).producido).toBe(7);
    expect(avanceDe(p, conAnulada).pendiente).toBe(14);
  });

  it('si se produjo de más, el pendiente es cero y no negativo', () => {
    const cuatro = [...tres, carga({ id: 'd', pedidoId: 'P-0001', m3: 7 })];
    expect(avanceDe(p, cuatro).producido).toBe(28);
    expect(avanceDe(p, cuatro).pendiente).toBe(0);
    expect(avanceDe(p, cuatro).pct).toBe(100);
  });

  it('el total vale por lo PRODUCIDO, no por lo pedido', () => {
    // Se pidieron 21 y salieron 14: se cobran 14.
    expect(avanceDe(p, tres.slice(0, 2)).total).toBe(14 * 89_000);
  });

  it('un pedido sin pastones todavía no vale nada', () => {
    const a = avanceDe(p, []);
    expect(a.producido).toBe(0);
    expect(a.total).toBe(0);
    expect(a.pendiente).toBe(21);
  });
});

describe('candidatosPara', () => {
  const abiertos = [
    pedido({ id: 'P-0001', receta: 'H-21', m3: 21 }),
    pedido({ id: 'P-0002', receta: 'H-21', m3: 7 }),
    pedido({ id: 'P-0003', receta: 'H-25', m3: 12 }),
    pedido({ id: 'P-0004', receta: 'H-21', m3: 7, estado: 'completo' }),
  ];

  it('sólo ofrece pedidos de la MISMA receta', () => {
    const c = candidatosPara(carga({ receta: 'H-25' }), abiertos, []);
    expect(c.map((p) => p.id)).toEqual(['P-0003']);
  });

  it('no ofrece pedidos que ya no están abiertos', () => {
    expect(candidatosPara(carga(), abiertos, []).map((p) => p.id)).not.toContain('P-0004');
  });

  it('no ofrece pedidos ya cubiertos, aunque figuren abiertos', () => {
    const cubierto = [carga({ id: 'x', pedidoId: 'P-0002', m3: 7 })];
    expect(candidatosPara(carga(), abiertos, cubierto).map((p) => p.id)).not.toContain('P-0002');
  });

  it('primero el pedido al que le falta justo este pastón', () => {
    // A P-0002 le faltan 7 y el pastón es de 7: calza exacto.
    expect(candidatosPara(carga({ m3: 7 }), abiertos, [])[0]!.id).toBe('P-0002');
  });
});

describe('estadoDe', () => {
  it('se deriva de lo producido, no se guarda', () => {
    const p = pedido({ m3: 14, estado: 'abierto' });
    const cubierto = [
      carga({ id: 'a', pedidoId: 'P-0001', m3: 7 }),
      carga({ id: 'b', pedidoId: 'P-0001', m3: 7 }),
    ];
    expect(estadoDe(p, cubierto)).toBe('completo');
    expect(estadoDe(p, cubierto.slice(0, 1))).toBe('abierto');
  });

  it('anular un pastón devuelve el pedido a abierto', () => {
    // Guardado, el pedido quedaría en "completo" para siempre.
    const p = pedido({ m3: 14 });
    const conAnulada = [
      carga({ id: 'a', pedidoId: 'P-0001', m3: 7 }),
      carga({ id: 'b', pedidoId: 'P-0001', m3: 7, estado: 'anulada' }),
    ];
    expect(estadoDe(p, conAnulada)).toBe('abierto');
  });

  it('un pedido cancelado no vuelve solo', () => {
    const p = pedido({ m3: 7, estado: 'cancelado' });
    expect(estadoDe(p, [carga({ pedidoId: 'P-0001', m3: 7 })])).toBe('cancelado');
  });
});

describe('coincidePedido', () => {
  const p = pedido({ id: 'P-0042', receta: 'H-21', obra: 'Chacabuco 320' });

  it('encuentra por número, sin el guión', () => {
    expect(coincidePedido(p, null, 'p0042')).toBe(true);
    expect(coincidePedido(p, null, '42')).toBe(true);
  });

  it('encuentra por cliente sin acento y por obra', () => {
    expect(coincidePedido(p, 'Corralón El Ladrillo', 'corralon')).toBe(true);
    expect(coincidePedido(p, null, 'chacabuco')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincidePedido(p, null, '  ')).toBe(true);
  });

  it('lo que no coincide, no coincide', () => {
    expect(coincidePedido(p, 'Mostrador', 'riquelme')).toBe(false);
  });
});
