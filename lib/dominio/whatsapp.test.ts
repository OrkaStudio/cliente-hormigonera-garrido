import { describe, expect, it } from 'vitest';
import { telefonoParaWhatsapp } from './whatsapp';

/**
 * Un número mal armado no falla: abre WhatsApp y dice que el contacto no
 * existe. Como el error es silencioso, se cubre acá.
 */
describe('telefonoParaWhatsapp', () => {
  it('agrega el 9 que WhatsApp pide para Argentina', () => {
    expect(telefonoParaWhatsapp('2241 40-1180')).toBe('5492241401180');
  });

  it('saca el 15 del móvil, que no va en el formato internacional', () => {
    // 2241 (área) + 15 + 63-4402 (abonado) → 549 2241 634402
    expect(telefonoParaWhatsapp('2241 15-63-4402')).toBe('5492241634402');
  });

  it('acepta el número ya escrito en internacional', () => {
    expect(telefonoParaWhatsapp('+54 9 2271 40-2211')).toBe('5492271402211');
  });

  it('acepta el 0 de discado nacional', () => {
    expect(telefonoParaWhatsapp('02241 401180')).toBe('5492241401180');
  });

  it('acepta el 11 de Buenos Aires con área de dos dígitos', () => {
    expect(telefonoParaWhatsapp('11 4567-8900')).toBe('5491145678900');
  });

  it('no inventa un número cuando faltan dígitos', () => {
    expect(telefonoParaWhatsapp('40-1180')).toBeNull();
    expect(telefonoParaWhatsapp('')).toBeNull();
    expect(telefonoParaWhatsapp(null)).toBeNull();
  });

  it('no ofrece nada si lo cargado no es un teléfono', () => {
    expect(telefonoParaWhatsapp('sin datos')).toBeNull();
  });
});
