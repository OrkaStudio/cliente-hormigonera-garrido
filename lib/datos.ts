import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Carga = {
  id: string;
  batch_nro: number;
  receta: string;
  m3: number;
  fecha_hora_inicio: string;
  duracion_min: number;
  operador: string;
  cemento_objetivo: number;
  cemento_real: number;
  agua_objetivo: number;
  agua_real: number;
  aridos_objetivo: number;
  aridos_real: number;
  aditivos_objetivo: number;
  aditivos_real: number;
  desvio_cemento: number;
  desvio_agua: number;
  desvio_aridos: number;
  desvio_aditivos: number;
  costo_real: number;
  costo_receta: number;
  facturado: number;
  margen: number;
};

export type Parametros = {
  precio_venta_m3: number;
  costo_cemento_kg: number;
  costo_arido_kg: number;
  costo_agua_l: number;
  costo_aditivo_kg: number;
};

/** "Hoy" en el demo es el último día con producción, no la fecha del sistema. */
export async function ultimoDia(): Promise<string> {
  const { data } = await supabase
    .from("cargas")
    .select("fecha_hora_inicio")
    .order("fecha_hora_inicio", { ascending: false })
    .limit(1)
    .single();
  return (data?.fecha_hora_inicio ?? new Date().toISOString()).slice(0, 10);
}

export async function parametros(): Promise<Parametros> {
  const { data } = await supabase
    .from("parametros_costo")
    .select("*")
    .eq("id", 1)
    .single();
  return data as Parametros;
}

export async function cargasDelDia(dia: string): Promise<Carga[]> {
  const { data } = await supabase
    .from("v_cargas_costo")
    .select("*")
    .gte("fecha_hora_inicio", `${dia}T00:00:00`)
    .lte("fecha_hora_inicio", `${dia}T23:59:59`)
    .order("fecha_hora_inicio", { ascending: false });
  return (data ?? []) as Carga[];
}

export async function todasLasCargas(): Promise<Carga[]> {
  const { data } = await supabase
    .from("v_cargas_costo")
    .select("*")
    .order("fecha_hora_inicio", { ascending: false });
  return (data ?? []) as Carga[];
}

export type Totales = {
  cargas: number;
  m3: number;
  facturado: number;
  costo: number;
  margen: number;
  cementoRegalado: number;
  plataRegalada: number;
};

export function totalizar(cargas: Carga[], costoCementoKg: number): Totales {
  const acc = cargas.reduce(
    (t, c) => ({
      m3: t.m3 + Number(c.m3),
      facturado: t.facturado + Number(c.facturado),
      costo: t.costo + Number(c.costo_real),
      margen: t.margen + Number(c.margen),
      cementoRegalado: t.cementoRegalado + Number(c.desvio_cemento),
    }),
    { m3: 0, facturado: 0, costo: 0, margen: 0, cementoRegalado: 0 },
  );
  return {
    cargas: cargas.length,
    ...acc,
    plataRegalada: acc.cementoRegalado * costoCementoKg,
  };
}

/** Producción por día, para el gráfico de barras. */
export function porDia(cargas: Carga[]) {
  const mapa = new Map<string, { m3: number; cargas: number }>();
  for (const c of cargas) {
    const dia = c.fecha_hora_inicio.slice(0, 10);
    const prev = mapa.get(dia) ?? { m3: 0, cargas: 0 };
    mapa.set(dia, { m3: prev.m3 + Number(c.m3), cargas: prev.cargas + 1 });
  }
  return [...mapa.entries()]
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Desvío promedio de cemento por receta — dónde está la fuga. */
export function desvioPorReceta(cargas: Carga[], costoCementoKg: number) {
  const mapa = new Map<
    string,
    { cargas: number; objetivo: number; real: number; desvio: number }
  >();
  for (const c of cargas) {
    const prev =
      mapa.get(c.receta) ?? { cargas: 0, objetivo: 0, real: 0, desvio: 0 };
    mapa.set(c.receta, {
      cargas: prev.cargas + 1,
      objetivo: prev.objetivo + Number(c.cemento_objetivo),
      real: prev.real + Number(c.cemento_real),
      desvio: prev.desvio + Number(c.desvio_cemento),
    });
  }
  return [...mapa.entries()]
    .map(([receta, v]) => ({
      receta,
      cargas: v.cargas,
      desvioKg: v.desvio,
      desvioPct: (v.desvio / v.objetivo) * 100,
      plata: v.desvio * costoCementoKg,
    }))
    .sort((a, b) => b.plata - a.plata);
}
