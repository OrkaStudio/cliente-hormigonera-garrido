import { describe, expect, it } from 'vitest';
import { mensajeDeDocumento, telefonoParaWhatsapp } from './whatsapp';
import type { Documento } from './documentos';

const REMITO: Documento = {
  numero: '0001-00000123',
  tipo: 'remito',
  emitido: '2026-08-21T14:20:00.000Z',
  clienteId: 'CL-01',
  clienteNombre: 'Constructora del Este SRL',
  clienteCuit: '30-71044821-9',
  clienteDireccion: 'Av. San Martín 1240, Monte',
  lineas: [
    { detalle: 'Hormigón elaborado H-21', cantidad: 6, unidad: 'm³', precioUnitario: 89000 },
  ],
  obra: 'Obra Los Álamos',
};

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

describe('mensajeDeDocumento', () => {
  it('saluda por el nombre de pila y dice qué, dónde y cuánto', () => {
    const m = mensajeDeDocumento(REMITO, 'Marcelo Duarte');
    expect(m).toContain('Hola Marcelo');
    expect(m).toContain('0001-00000123');
    expect(m).toContain('H-21');
    expect(m).toContain('Obra Los Álamos');
    expect(m).toContain('534.000');
  });

  it('NO manda un enlace al documento', () => {
    // Estuvo puesto y no servía: los papeles viven en el navegador que
    // los emitió, y cuando haya login van a quedar detrás de la puerta.
    // El PDF se adjunta a mano.
    const m = mensajeDeDocumento(REMITO, 'Marcelo');
    expect(m).not.toMatch(/https?:\/\//);
    expect(m).not.toContain('/documentos/');
  });

  it('se las arregla sin nombre de contacto', () => {
    expect(mensajeDeDocumento(REMITO, null)).toMatch(/^Hola, /);
  });

  it('el remito sin valores no dice ningún precio', () => {
    const sinValores: Documento = {
      ...REMITO,
      tipo: 'remito-sin-valores',
      lineas: REMITO.lineas.map((l) => ({ ...l, precioUnitario: null })),
    };
    expect(mensajeDeDocumento(sinValores, 'Marcelo')).not.toContain('Total');
  });
});
