import { describe, expect, it } from 'vitest';

import type { Carga } from '@/lib/datos/tipos';
import type { Documento } from './documentos';
import { agruparEnVentas, coincideVenta, documentoDe } from './ventas';

function carga(p: Partial<Carga> = {}): Carga {
  return {
    id: 'C-1595',
    momento: '2026-08-25T15:11:00.000Z',
    receta: 'H-21',
    m3: 7,
    clienteId: 'CL-01',
    estado: 'asignada',
    montoFacturado: 622_223,
    total: 622_223,
    pesadas: [],
    ...p,
  };
}

function doc(p: Partial<Documento> = {}): Documento {
  return {
    numero: '0001-00000042',
    tipo: 'remito',
    emitido: '2026-08-25T16:00:00.000Z',
    clienteId: 'CL-01',
    clienteNombre: 'Corralón El Ladrillo',
    clienteCuit: null,
    clienteDireccion: null,
    cargaId: 'C-1595',
    receta: 'H-21',
    m3: 7,
    total: 622_223,
    ...p,
  } as Documento;
}

describe('agruparEnVentas', () => {
  it('junta los pastones del mismo cliente, receta y día en UNA venta', () => {
    const ventas = agruparEnVentas([
      carga({ id: 'C-1', m3: 6, total: 500_000, montoFacturado: 500_000 }),
      carga({
        id: 'C-2',
        m3: 6,
        total: 500_000,
        montoFacturado: 0,
        momento: '2026-08-25T16:40:00.000Z',
      }),
    ]);

    expect(ventas).toHaveLength(1);
    expect(ventas[0]!.m3).toBe(12);
    expect(ventas[0]!.total).toBe(1_000_000);
    expect(ventas[0]!.cargas.map((c) => c.id)).toEqual(['C-2', 'C-1']);
  });

  it('no junta lo que es de otro cliente, otra receta u otro día', () => {
    const ventas = agruparEnVentas([
      carga({ id: 'C-1' }),
      carga({ id: 'C-2', clienteId: 'CL-02' }),
      carga({ id: 'C-3', receta: 'H-30' }),
      carga({ id: 'C-4', momento: '2026-08-26T15:11:00.000Z' }),
    ]);

    expect(ventas).toHaveLength(4);
  });

  it('deja afuera lo que todavía no es de nadie', () => {
    const ventas = agruparEnVentas([carga({ clienteId: null, total: 0, montoFacturado: null })]);
    expect(ventas).toHaveLength(0);
  });

  it('deja afuera las anuladas: consumieron material, pero no se vendieron', () => {
    const ventas = agruparEnVentas([
      carga({ id: 'C-1' }),
      carga({ id: 'C-2', estado: 'anulada', m3: 6, total: 500_000 }),
    ]);

    expect(ventas).toHaveLength(1);
    expect(ventas[0]!.m3).toBe(7);
  });

  it('suma el corte fiscal de todos sus pastones', () => {
    const [venta] = agruparEnVentas([
      carga({ id: 'C-1', total: 600_000, montoFacturado: 600_000 }),
      carga({ id: 'C-2', total: 400_000, montoFacturado: 0 }),
    ]);

    expect(venta!.blanco).toBe(600_000);
    expect(venta!.negro).toBe(400_000);
    expect(Math.round(venta!.pctBlanco!)).toBe(60);
  });

  it('sin corte definido no afirma nada: el porcentaje es null, no cero', () => {
    const [venta] = agruparEnVentas([carga({ montoFacturado: null })]);
    expect(venta!.pctBlanco).toBeNull();
  });

  it('el día lo decide la hora LOCAL, no el UTC del ISO', () => {
    // 21:52 en Buenos Aires es el día siguiente en UTC. Cortar el ISO
    // mandaría este pastón a otra venta que la pantalla no muestra ahí.
    const nocturna = new Date(2026, 7, 25, 21, 52).toISOString();
    const ventas = agruparEnVentas([carga({ id: 'C-1' }), carga({ id: 'C-2', momento: nocturna })]);

    expect(ventas).toHaveLength(1);
    expect(ventas[0]!.dia).toBe('2026-08-25');
  });

  it('las más nuevas primero', () => {
    const ventas = agruparEnVentas([
      carga({ id: 'C-1', momento: '2026-08-24T10:00:00.000Z' }),
      carga({ id: 'C-2', momento: '2026-08-26T10:00:00.000Z' }),
    ]);

    expect(ventas.map((v) => v.dia)).toEqual(['2026-08-26', '2026-08-24']);
  });
});

describe('documentoDe', () => {
  it('encuentra el papel por cualquiera de los pastones de la venta', () => {
    const [venta] = agruparEnVentas([carga({ id: 'C-1' }), carga({ id: 'C-2' })]);
    expect(documentoDe(venta!, [doc({ cargaId: 'C-2' })])?.numero).toBe('0001-00000042');
  });

  it('devuelve null si ninguno tiene papel', () => {
    const [venta] = agruparEnVentas([carga({ id: 'C-1' })]);
    expect(documentoDe(venta!, [doc({ cargaId: 'C-99' })])).toBeNull();
  });
});

describe('coincideVenta', () => {
  const [v] = agruparEnVentas([carga()]);
  const d = doc();

  it('encuentra por número de carga, con o sin prefijo', () => {
    expect(coincideVenta(v!, null, null, 'c1595')).toBe(true);
    expect(coincideVenta(v!, null, null, '1595')).toBe(true);
  });

  it('encuentra por el número de CUALQUIERA de sus pastones', () => {
    const [varios] = agruparEnVentas([carga({ id: 'C-1' }), carga({ id: 'C-2' })]);
    expect(coincideVenta(varios!, null, null, 'c-2')).toBe(true);
  });

  it('encuentra por receta', () => {
    expect(coincideVenta(v!, null, null, 'h21')).toBe(true);
  });

  it('encuentra por cliente, sin acento', () => {
    expect(coincideVenta(v!, 'Corralón El Ladrillo', null, 'corralon')).toBe(true);
  });

  it('encuentra por número de documento, sin el guión', () => {
    expect(coincideVenta(v!, null, d, '42')).toBe(true);
    expect(coincideVenta(v!, null, d, '000100000042')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincideVenta(v!, null, null, '   ')).toBe(true);
  });

  it('lo que no coincide, no coincide', () => {
    expect(coincideVenta(v!, 'Mostrador', d, 'riquelme')).toBe(false);
  });
});
