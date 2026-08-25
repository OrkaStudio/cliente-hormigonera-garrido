import { describe, expect, it } from 'vitest';

import type { Carga } from '@/lib/datos/tipos';
import type { Documento } from './documentos';
import { coincideVenta, documentoDe } from './ventas';

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
    lineas: [],
    ...p,
  };
}

describe('documentoDe', () => {
  it('cruza por el id de la carga, no por el cliente', () => {
    // Dos documentos del mismo cliente: el que vale es el de ESTA carga.
    const docs = [
      doc({ numero: '0001-00000041', cargaId: 'C-1590' }),
      doc({ numero: '0001-00000042', cargaId: 'C-1595' }),
    ];
    expect(documentoDe('C-1595', docs)?.numero).toBe('0001-00000042');
  });

  it('sin documento devuelve null, no el primero que encuentra', () => {
    expect(documentoDe('C-1599', [doc({ cargaId: 'C-1595' })])).toBeNull();
  });

  it('un documento sin carga asociada no le corresponde a nadie', () => {
    expect(documentoDe('C-1595', [doc({ cargaId: undefined })])).toBeNull();
  });
});

describe('coincideVenta', () => {
  const v = carga();
  const d = doc({ cargaId: 'C-1595' });

  it('encuentra por número de carga, sin el guión', () => {
    expect(coincideVenta(v, null, null, 'c1595')).toBe(true);
    expect(coincideVenta(v, null, null, '1595')).toBe(true);
  });

  it('encuentra por receta', () => {
    expect(coincideVenta(v, null, null, 'h21')).toBe(true);
  });

  it('encuentra por cliente, sin acento', () => {
    expect(coincideVenta(v, 'Corralón El Ladrillo', null, 'corralon')).toBe(true);
  });

  it('encuentra por número de documento, sin el guión', () => {
    expect(coincideVenta(v, null, d, '42')).toBe(true);
    expect(coincideVenta(v, null, d, '000100000042')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincideVenta(v, null, null, '   ')).toBe(true);
  });

  it('lo que no coincide, no coincide', () => {
    expect(coincideVenta(v, 'Mostrador', d, 'riquelme')).toBe(false);
  });
});
