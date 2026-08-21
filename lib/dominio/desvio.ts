import type { Carga, PesadaMaterial } from '@/lib/datos/tipos';

export interface DesvioMaterial extends PesadaMaterial {
  /** Cuanto se corrio la balanza contra lo que pidio el PLC, en %. */
  porcentaje: number;
}

/** El desvio de cada balanza de una carga, en el orden en que vinieron. */
export function desviosDe(carga: Pick<Carga, 'pesadas'>): DesvioMaterial[] {
  return carga.pesadas
    .filter((p) => p.objetivo > 0)
    .map((p) => ({ ...p, porcentaje: ((p.real - p.objetivo) / p.objetivo) * 100 }));
}

/**
 * La balanza que mas se corrio. **No el promedio.**
 *
 * El promedio miente justo cuando importa: cemento +3% y agua -3% dan
 * 0%, y la tabla muestra una carga sana que en realidad tiene las dos
 * balanzas corridas. La regla del dominio es que fuera de rango la app
 * tiene que gritar, no mostrar un numero creible y falso.
 *
 * Se compara por valor ABSOLUTO — dosificar de menos tambien es un
 * problema, aunque no sea el que le cuesta plata a Jose.
 */
export function peorDesvio(carga: Pick<Carga, 'pesadas'>): DesvioMaterial | null {
  const desvios = desviosDe(carga);
  if (desvios.length === 0) return null;

  return desvios.reduce((peor, d) =>
    Math.abs(d.porcentaje) > Math.abs(peor.porcentaje) ? d : peor,
  );
}

/** `+1,9%` / `-0,4%`. El signo importa: dice para que lado se fue. */
export function formatoDesvio(porcentaje: number): string {
  const signo = porcentaje > 0 ? '+' : porcentaje < 0 ? '-' : '';
  return `${signo}${Math.abs(porcentaje).toFixed(1).replace('.', ',')}%`;
}

/**
 * El detalle de las cuatro balanzas, una por linea, para el tooltip.
 *
 * Es un `title` nativo y no un popover a proposito: la tabla se mira en
 * una notebook de oficina (confirmado con Fran el 21/08), el texto lo
 * lee el lector de pantalla igual, y no suma un componente flotante
 * mas para mantener. Si hace falta filtrar u ordenar por balanza, ahi
 * si conviene un panel de verdad.
 */
export function detalleDeBalanzas(carga: Pick<Carga, 'pesadas'>): string {
  return desviosDe(carga)
    .map(
      (d) =>
        `${d.material}: pidió ${d.objetivo.toLocaleString('es-AR')} kg, pesó ${d.real.toLocaleString('es-AR')} kg (${formatoDesvio(d.porcentaje)})`,
    )
    .join('\n');
}
