import { describe, expect, it } from 'vitest';
import { cerroElCiclo, desvioDosificacion } from './plc';

describe('cerroElCiclo', () => {
  it('dispara solo en la transicion de automatico a parado', () => {
    expect(cerroElCiclo('automatico', 'parado')).toBe(true);
  });

  it('no dispara mientras sigue dosificando', () => {
    // Si disparara por tiempo, habria una fila cada dos segundos en vez
    // de una por carga.
    expect(cerroElCiclo('automatico', 'automatico')).toBe(false);
  });

  it('una pausa en el medio no cierra la carga', () => {
    expect(cerroElCiclo('automatico', 'pausa')).toBe(false);
    expect(cerroElCiclo('pausa', 'parado')).toBe(false);
  });

  it('arrancar no cierra nada', () => {
    expect(cerroElCiclo('parado', 'automatico')).toBe(false);
  });
});

describe('desvioDosificacion', () => {
  it('mide contra el objetivo que pidio el PLC', () => {
    const d = { material: 'Cemento' as const, objetivo: 2000, real: 2040, unidad: 'kg' };
    expect(desvioDosificacion(d)).toBeCloseTo(2);
  });

  it('sin objetivo no inventa un desvio', () => {
    const d = { material: 'Agua' as const, objetivo: 0, real: 10, unidad: 'L' };
    expect(desvioDosificacion(d)).toBe(0);
  });
});
