import { describe, expect, it } from 'vitest';
import {
  costoCombustible,
  franjaDe,
  kmDondeSeComeElMargen,
  litrosDelViaje,
  FLETE_POR_DEFECTO,
} from './combustible';

describe('litrosDelViaje', () => {
  it('cuenta la ida cargada y la vuelta vacia', () => {
    // 10 km: 4,8 L yendo + 3,2 L volviendo
    expect(litrosDelViaje(10)).toBeCloseTo(8);
  });

  it('un viaje de cero km no quema nada', () => {
    expect(litrosDelViaje(0)).toBe(0);
    expect(litrosDelViaje(-5)).toBe(0);
  });
});

describe('costoCombustible', () => {
  it('multiplica los litros por el precio del dia', () => {
    expect(costoCombustible(10)).toBeCloseTo(8 * FLETE_POR_DEFECTO.precioLitro);
  });

  it('respeta parametros propios: el gasoil se mueve todo el tiempo', () => {
    const caro = costoCombustible(10, { ...FLETE_POR_DEFECTO, precioLitro: 3000 });
    expect(caro).toBeGreaterThan(costoCombustible(10));
  });
});

describe('kmDondeSeComeElMargen', () => {
  it('encuentra la distancia donde el gasoil se lleva todo el margen', () => {
    const margen = 228_000;
    const km = kmDondeSeComeElMargen(margen)!;
    // A esa distancia exacta, el combustible iguala al margen.
    expect(costoCombustible(km)).toBeCloseTo(margen, 0);
  });

  it('no devuelve nada si la carga no dejaba margen', () => {
    expect(kmDondeSeComeElMargen(0)).toBeNull();
    expect(kmDondeSeComeElMargen(-100)).toBeNull();
  });
});

describe('franjaDe', () => {
  it('agrupa por cercania', () => {
    expect(franjaDe(8)).toBe('0–10 km');
    expect(franjaDe(10)).toBe('0–10 km');
    expect(franjaDe(11)).toBe('10–25 km');
    expect(franjaDe(120)).toBe('+50 km');
  });
});
