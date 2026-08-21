import { describe, expect, it } from 'vitest';

import type { Carga } from '@/lib/datos/tipos';
import { derivarAlertas } from './alertas';

function sinCliente(momento: string, m3 = 6): Carga {
  return {
    id: `C-${momento}`,
    momento,
    receta: 'H-21',
    m3,
    clienteId: null,
    estado: 'registrada',
    montoFacturado: null,
    total: 0,
    pesadas: [],
  };
}

function alertaSinAsignar(cargas: Carga[], ahora: Date) {
  return derivarAlertas(cargas, [], ahora).find((a) => a.id === 'sin-asignar');
}

/**
 * El bug de la medianoche: la alerta mira TODO el historico, pero convive
 * con KPIs que miran solo hoy. A las 00:05 la pantalla mostraba
 * "CARGAS 0" al lado de "hay una carga sin cliente — 6 m3", que se lee
 * como una contradiccion. La alerta tiene que decir de cuando es.
 */
describe('derivarAlertas — cargas sin cliente', () => {
  it('dice "hoy" cuando la carga es del mismo dia', () => {
    const a = alertaSinAsignar(
      [sinCliente('2026-08-21T14:00:00')],
      new Date('2026-08-21T18:00:00'),
    );

    expect(a?.detalle).toContain('producidos hoy');
  });

  it('data la carga cuando ya paso la medianoche', () => {
    const a = alertaSinAsignar(
      [sinCliente('2026-08-20T23:16:00')],
      new Date('2026-08-21T00:05:00'),
    );

    expect(a?.detalle).toContain('el 20/8');
    expect(a?.detalle).not.toContain('hoy');
  });

  it('cuando abarcan varios dias, dice el rango', () => {
    const a = alertaSinAsignar(
      [sinCliente('2026-08-19T09:00:00'), sinCliente('2026-08-20T23:16:00')],
      new Date('2026-08-21T00:05:00'),
    );

    expect(a?.detalle).toContain('entre el 19/8 y el 20/8');
  });

  // Con la hora sola, una carga de anteayer parecia de esta manana.
  it('las filas del detalle llevan fecha si no son de hoy', () => {
    const a = alertaSinAsignar(
      [sinCliente('2026-08-20T23:16:00')],
      new Date('2026-08-21T00:05:00'),
    );

    expect(a?.filas?.[0]?.etiqueta).toBe('20/8 23:16');
  });

  it('las de hoy siguen mostrando solo la hora', () => {
    const a = alertaSinAsignar(
      [sinCliente('2026-08-21T07:42:00')],
      new Date('2026-08-21T09:00:00'),
    );

    expect(a?.filas?.[0]?.etiqueta).toBe('07:42');
  });
});
