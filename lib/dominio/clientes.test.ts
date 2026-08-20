import { describe, expect, it } from 'vitest';

import type { Carga, Cliente } from '@/lib/datos/tipos';
import {
  coincide,
  ordenarPorActividad,
  porcentajeEnBlanco,
  resumenDeCliente,
  type ClienteConResumen,
} from './clientes';

function carga(p: Partial<Carga>): Carga {
  return {
    id: 'C-1',
    momento: '2026-08-20T10:00:00.000Z',
    receta: 'H-21',
    m3: 7,
    clienteId: 'CL-01',
    estado: 'asignada',
    fiscal: 'blanco',
    total: 100_000,
    pesadas: [],
    ...p,
  };
}

function cliente(p: Partial<Cliente>): Cliente {
  return {
    id: 'CL-01',
    nombre: 'Constructora del Este SRL',
    contacto: null,
    telefono: null,
    mail: null,
    direccion: null,
    cuit: null,
    notas: null,
    activo: true,
    ...p,
  };
}

describe('resumenDeCliente', () => {
  it('suma sólo las cargas de ese cliente', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', clienteId: 'CL-01', m3: 7, total: 100 }),
      carga({ id: 'b', clienteId: 'CL-02', m3: 6, total: 200 }),
    ]);

    expect(r.ventas).toBe(1);
    expect(r.m3).toBe(7);
    expect(r.facturado).toBe(100);
  });

  // R3 — una carga sin cliente no le suma a nadie.
  it('no le adjudica a nadie una carga sin asignar', () => {
    const r = resumenDeCliente('CL-01', [carga({ clienteId: null, total: 999 })]);
    expect(r.ventas).toBe(0);
    expect(r.facturado).toBe(0);
  });

  // Una carga abortada no es una venta: sumarla infla los m³ de alguien
  // que nunca los recibió.
  it('deja afuera las anuladas', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', estado: 'facturada', m3: 7 }),
      carga({ id: 'b', estado: 'anulada', m3: 6 }),
    ]);

    expect(r.ventas).toBe(1);
    expect(r.m3).toBe(7);
  });

  it('toma la última compra por fecha, no por orden de llegada', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', momento: '2026-08-20T10:00:00.000Z' }),
      carga({ id: 'b', momento: '2026-08-14T10:00:00.000Z' }),
      carga({ id: 'c', momento: '2026-08-18T10:00:00.000Z' }),
    ]);

    expect(r.ultimaCompra).toBe('2026-08-20T10:00:00.000Z');
  });

  it('la receta frecuente es la más repetida', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', receta: 'H-30' }),
      carga({ id: 'b', receta: 'H-21' }),
      carga({ id: 'c', receta: 'H-21' }),
    ]);

    expect(r.recetaFrecuente).toBe('H-21');
  });

  it('desempata igual siempre, sin depender del orden de las cargas', () => {
    const unas = [carga({ id: 'a', receta: 'H-30' }), carga({ id: 'b', receta: 'H-21' })];
    const otras = [...unas].reverse();

    expect(resumenDeCliente('CL-01', unas).recetaFrecuente).toBe(
      resumenDeCliente('CL-01', otras).recetaFrecuente,
    );
  });

  it('un cliente sin cargas da todo en cero y sin fecha', () => {
    const r = resumenDeCliente('CL-09', [carga({})]);
    expect(r).toEqual({
      ventas: 0,
      m3: 0,
      facturado: 0,
      ultimaCompra: null,
      recetaFrecuente: null,
      blanco: 0,
      negro: 0,
    });
  });
});

describe('porcentajeEnBlanco', () => {
  it('calcula sobre las marcadas', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', fiscal: 'blanco' }),
      carga({ id: 'b', fiscal: 'blanco' }),
      carga({ id: 'c', fiscal: 'negro' }),
    ]);

    expect(porcentajeEnBlanco(r)).toBe(67);
  });

  // Sin esto, "todavía no se definió" se leería como "le vende todo en
  // negro", que es afirmar algo que nadie dijo.
  it('devuelve null cuando no hay ninguna marcada, no 0', () => {
    const r = resumenDeCliente('CL-01', [carga({ fiscal: null })]);
    expect(porcentajeEnBlanco(r)).toBeNull();
  });

  it('no cuenta las sin marcar en el denominador', () => {
    const r = resumenDeCliente('CL-01', [
      carga({ id: 'a', fiscal: 'blanco' }),
      carga({ id: 'b', fiscal: null }),
    ]);

    expect(porcentajeEnBlanco(r)).toBe(100);
  });
});

describe('ordenarPorActividad', () => {
  const con = (id: string, nombre: string, ultimaCompra: string | null): ClienteConResumen => ({
    ...cliente({ id, nombre }),
    resumen: {
      ventas: 0,
      m3: 0,
      facturado: 0,
      ultimaCompra,
      recetaFrecuente: null,
      blanco: 0,
      negro: 0,
    },
  });

  it('pone primero al que compró más recientemente', () => {
    const orden = ordenarPorActividad([
      con('CL-01', 'Viejo', '2026-01-10T10:00:00.000Z'),
      con('CL-02', 'Reciente', '2026-08-19T10:00:00.000Z'),
    ]);

    expect(orden.map((c) => c.id)).toEqual(['CL-02', 'CL-01']);
  });

  it('manda al final a los que nunca compraron', () => {
    const orden = ordenarPorActividad([
      con('CL-01', 'Nunca', null),
      con('CL-02', 'Compró', '2026-01-10T10:00:00.000Z'),
    ]);

    expect(orden.map((c) => c.id)).toEqual(['CL-02', 'CL-01']);
  });

  it('no muta el arreglo que recibe', () => {
    const original = [
      con('CL-01', 'Viejo', '2026-01-10T10:00:00.000Z'),
      con('CL-02', 'Reciente', '2026-08-19T10:00:00.000Z'),
    ];
    ordenarPorActividad(original);

    expect(original.map((c) => c.id)).toEqual(['CL-01', 'CL-02']);
  });
});

describe('coincide', () => {
  const corralon = cliente({
    nombre: 'Corralón El Ladrillo',
    contacto: 'Rubén Ibáñez',
    cuit: '20-16884203-4',
  });

  // Nadie va a tipear el tilde para encontrar el corralón.
  it('encuentra sin acentos', () => {
    expect(coincide(corralon, 'corralon')).toBe(true);
  });

  it('encuentra con acentos igual', () => {
    expect(coincide(corralon, 'Corralón')).toBe(true);
  });

  it('busca también por contacto y por CUIT', () => {
    expect(coincide(corralon, 'ruben')).toBe(true);
    expect(coincide(corralon, '16884203')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincide(corralon, '   ')).toBe(true);
  });

  it('no inventa coincidencias', () => {
    expect(coincide(corralon, 'riquelme')).toBe(false);
  });
});
