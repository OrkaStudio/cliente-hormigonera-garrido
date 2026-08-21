const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const $ = (n: number) => pesos.format(n);
export const num = (n: number) => numero.format(n);
export const dec = (n: number) => decimal.format(n);
export const kg = (n: number) => `${numero.format(n)} kg`;

/** 24 horas, siempre. En una planta el turno es "14:20", no "02:20 p. m.". */
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const fechaLarga = (dia: string) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const fechaCorta = (dia: string) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });

/**
 * Un momento ISO como fecha corta: 14/08. Para columnas de listado.
 *
 * Va sin "hace 3 días" a propósito: el texto relativo se calcula contra
 * el reloj y en una página renderizada en el servidor no coincide con el
 * del navegador. Una fecha no miente nunca.
 */
export const fechaDeMomento = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

/** La fecha completa de un momento ISO: jueves, 20 de agosto. */
export const fechaLargaDeMomento = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** Un desvío con signo: +8 kg / −3 kg. */
export const signo = (n: number, unidad = "kg") =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${numero.format(Math.abs(n))} ${unidad}`;

/**
 * La fecha de un papel que se archiva: viernes, 21 de agosto de 2026.
 *
 * Lleva el año y las de pantalla no, a proposito. En la app el año se
 * sobreentiende porque se mira lo de esta semana; un remito guardado en
 * una carpeta se busca en enero del año que viene.
 */
export const fechaDeDocumento = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
