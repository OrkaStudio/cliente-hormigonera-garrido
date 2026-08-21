import { describe, expect, it } from 'vitest';

import type { PesadaMaterial } from '@/lib/datos/tipos';
import { desviosDe, formatoDesvio, peorDesvio } from './desvio';

function pesada(material: string, objetivo: number, real: number): PesadaMaterial {
  return { material, receta: objetivo, objetivo, real };
}

describe('peorDesvio', () => {
  it('devuelve la balanza que mas se corrio', () => {
    const peor = peorDesvio({
      pesadas: [
        pesada('Cemento', 1000, 1019), // +1,9%
        pesada('Arena', 1000, 1004), //  +0,4%
        pesada('Piedra', 1000, 998), //  -0,2%
      ],
    });

    expect(peor?.material).toBe('Cemento');
  });

  // El motivo entero de no usar el promedio: aca daria 0% y la tabla
  // mostraria una carga sana con las dos balanzas corridas.
  it('no se compensa con una balanza corrida al reves', () => {
    const peor = peorDesvio({
      pesadas: [pesada('Cemento', 1000, 1030), pesada('Agua', 1000, 970)],
    });

    expect(Math.abs(peor!.porcentaje)).toBeCloseTo(3, 5);
  });

  it('dosificar de menos tambien cuenta como desvio', () => {
    const peor = peorDesvio({
      pesadas: [pesada('Cemento', 1000, 1005), pesada('Agua', 1000, 950)],
    });

    expect(peor?.material).toBe('Agua');
    expect(peor?.porcentaje).toBeCloseTo(-5, 5);
  });

  it('sin pesadas devuelve null', () => {
    expect(peorDesvio({ pesadas: [] })).toBeNull();
  });

  // Sin objetivo no hay contra que comparar: dividir daria Infinity y la
  // carga se llevaria el peor puesto siempre.
  it('ignora las pesadas sin objetivo', () => {
    const r = desviosDe({ pesadas: [pesada('Aditivo', 0, 5), pesada('Cemento', 1000, 1010)] });
    expect(r).toHaveLength(1);
    expect(r[0]!.material).toBe('Cemento');
  });
});

describe('formatoDesvio', () => {
  it('lleva el signo, que dice para que lado se fue', () => {
    expect(formatoDesvio(1.9)).toBe('+1,9%');
    expect(formatoDesvio(-0.4)).toBe('-0,4%');
  });

  it('el cero va sin signo', () => {
    expect(formatoDesvio(0)).toBe('0,0%');
  });
});
