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

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
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

/** Un desvío con signo: +8 kg / −3 kg. */
export const signo = (n: number, unidad = "kg") =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${numero.format(Math.abs(n))} ${unidad}`;
