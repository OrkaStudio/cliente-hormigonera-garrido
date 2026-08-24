import type { Carga } from '@/lib/datos/tipos';
import { pesosDe } from './fiscal';

/**
 * Lo que se sabe mirando un conjunto de cargas.
 *
 * Todo se calcula: no hay ni un total guardado. Un acumulado en una
 * columna se desincroniza el día que alguien anula una carga vieja.
 */

/**
 * Qué color le toca a cada receta.
 *
 * Son tres y son fijas, así que el color es identidad —como el color de
 * una marca— y no un estado. Por eso puede usar la serie de datos: la
 * serie existe justamente para distinguir categorías sin pisar el
 * semáforo. Se asignan en orden y nunca se ciclan: una cuarta receta
 * toma s4, y una quinta va sin color antes que repetir uno.
 */
export const SERIE_RECETA = ['s1', 's2', 's3', 's4'] as const;
export type SerieReceta = (typeof SERIE_RECETA)[number];

export function colorDeReceta(receta: string, recetas: string[]): SerieReceta | null {
  const i = recetas.indexOf(receta);
  return i >= 0 && i < SERIE_RECETA.length ? SERIE_RECETA[i]! : null;
}

export interface ParteMezcla {
  receta: string;
  m3: number;
  /** Qué porción del volumen del período es esta receta. */
  pct: number;
}

/**
 * La mezcla del período: cuánto volumen salió de cada receta.
 *
 * Contesta "¿qué estuvimos haciendo hoy?" sin leer una sola fila. Se
 * ordena por volumen, no alfabéticamente: la que manda va primero.
 */
export function mezclaPorReceta(cargas: Carga[]): ParteMezcla[] {
  const total = cargas.reduce((a, c) => a + c.m3, 0);
  if (total <= 0) return [];

  const porReceta = new Map<string, number>();
  for (const c of cargas) porReceta.set(c.receta, (porReceta.get(c.receta) ?? 0) + c.m3);

  return [...porReceta.entries()]
    .map(([receta, m3]) => ({ receta, m3, pct: (m3 / total) * 100 }))
    .sort((a, b) => b.m3 - a.m3 || a.receta.localeCompare(b.receta));
}

export interface ResumenCargas {
  cargas: number;
  m3: number;
  facturado: number;
  /** Los pesos partidos, sobre lo que tiene el corte definido. */
  blanco: number;
  negro: number;
  /** Qué porcentaje va en blanco, o null si nada tiene el corte definido. */
  pctBlanco: number | null;
}

/**
 * El resumen de un conjunto de cargas.
 *
 * El denominador de blanco/negro excluye lo que todavía no tiene corte
 * definido: contar una carga sin asignar como negro es afirmar algo que
 * nadie dijo.
 */
export function resumirCargas(cargas: Carga[]): ResumenCargas {
  const cortes = cargas.map(pesosDe).filter((p) => p !== null);
  const blanco = cortes.reduce((a, p) => a + p.blanco, 0);
  const negro = cortes.reduce((a, p) => a + p.negro, 0);
  const definido = blanco + negro;

  return {
    cargas: cargas.length,
    m3: cargas.reduce((a, c) => a + c.m3, 0),
    facturado: cargas.reduce((a, c) => a + c.total, 0),
    blanco,
    negro,
    pctBlanco: definido > 0 ? (blanco / definido) * 100 : null,
  };
}

/**
 * El día calendario de una carga, en la zona de la planta.
 *
 * NO se puede cortar el ISO: `momento.slice(0, 10)` da el día en UTC, y
 * la hora que la pantalla muestra al lado es local. Con eso, una carga
 * de las 21:52 de un martes aparece bajo el miércoles y el resumen del
 * día cuenta una carga que no fue.
 */
export function diaLocal(momento: string): string {
  const d = new Date(momento);
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

export interface DiaDeCargas {
  /** El día calendario local, para la clave y el orden. */
  dia: string;
  momento: string;
  cargas: Carga[];
  resumen: ResumenCargas;
}

/**
 * El historial agrupado por día, del más reciente al más viejo.
 *
 * Cada día trae su propio resumen: la lista deja de ser una tira plana y
 * cada encabezado dice algo en vez de sólo separar.
 */
export function agruparPorDia(cargas: Carga[]): DiaDeCargas[] {
  const porDia = new Map<string, Carga[]>();

  for (const c of cargas) {
    const dia = diaLocal(c.momento);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, delDia]) => ({
      dia,
      momento: delDia[0]!.momento,
      cargas: delDia,
      resumen: resumirCargas(delDia),
    }));
}

/**
 * El buscador del historial. Por número de carga o por receta, sin
 * distinguir mayúsculas ni el guión: nadie tipea "C-1595" completo.
 */
export function coincideCarga(carga: Carga, busqueda: string): boolean {
  const limpiar = (t: string) => t.toLowerCase().replace(/[\s-]/g, '');
  const q = limpiar(busqueda);
  if (!q) return true;
  return [carga.id, carga.receta].some((v) => limpiar(v).includes(q));
}
