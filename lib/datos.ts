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

/**
 * Cartera de clientes — DEMO. Las cargas reales todavía no traen cliente,
 * así que lo derivamos de forma determinística del batch_nro (mismo batch →
 * mismo cliente, siempre). Con datos reales esto pasa a ser un campo de la carga.
 * Pesos ~Pareto: unos pocos habituales concentran el grueso del volumen.
 */
const CLIENTES: { nombre: string; peso: number }[] = [
  { nombre: "Constructora del Plata SA", peso: 22 },
  { nombre: "Corralón San Cayetano", peso: 16 },
  { nombre: "Edificadora Sur SRL", peso: 14 },
  { nombre: "Hormigones Monte SRL", peso: 12 },
  { nombre: "Vialidad Regional", peso: 10 },
  { nombre: "Corralón El Ladrillo", peso: 9 },
  { nombre: "Obra Los Álamos", peso: 7 },
  { nombre: "Constructora Riquelme e Hijos", peso: 6 },
  { nombre: "Particulares y varios", peso: 4 },
];

// 100 casilleros expandidos por peso; ×37 (coprimo con 100) desparrama cada
// cliente entre distintos batches/días en vez de bloques contiguos.
const BUCKET: string[] = CLIENTES.flatMap((c) => Array(c.peso).fill(c.nombre));

export function clienteDeCarga(c: Carga): string {
  const h = (((Number(c.batch_nro) * 37) % 100) + 100) % 100;
  return BUCKET[h];
}

export type PerfilCliente = {
  cliente: string;
  cargas: number;
  m3: number;
  facturado: number;
  margen: number;
  margenPct: number;
  ticketM3: number;
  recetaTop: string;
  ultimaCompra: string;
  sharePct: number;
};

/** Un perfil por cliente, ordenado por m³ comprados. */
export function perfilesClientes(cargas: Carga[]): PerfilCliente[] {
  const m3Total = cargas.reduce((s, c) => s + Number(c.m3), 0);
  const mapa = new Map<
    string,
    {
      cargas: number;
      m3: number;
      facturado: number;
      margen: number;
      recetas: Map<string, number>;
      ultima: string;
    }
  >();
  for (const c of cargas) {
    const cli = clienteDeCarga(c);
    const prev =
      mapa.get(cli) ??
      { cargas: 0, m3: 0, facturado: 0, margen: 0, recetas: new Map(), ultima: "" };
    prev.cargas += 1;
    prev.m3 += Number(c.m3);
    prev.facturado += Number(c.facturado);
    prev.margen += Number(c.margen);
    prev.recetas.set(c.receta, (prev.recetas.get(c.receta) ?? 0) + 1);
    const dia = c.fecha_hora_inicio.slice(0, 10);
    if (dia > prev.ultima) prev.ultima = dia;
    mapa.set(cli, prev);
  }
  return [...mapa.entries()]
    .map(([cliente, v]) => {
      const recetaTop =
        [...v.recetas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      return {
        cliente,
        cargas: v.cargas,
        m3: v.m3,
        facturado: v.facturado,
        margen: v.margen,
        margenPct: v.facturado ? (v.margen / v.facturado) * 100 : 0,
        ticketM3: v.cargas ? v.m3 / v.cargas : 0,
        recetaTop,
        ultimaCompra: v.ultima,
        sharePct: m3Total ? (v.m3 / m3Total) * 100 : 0,
      };
    })
    .sort((a, b) => b.m3 - a.m3);
}

export type RentabilidadReceta = {
  receta: string;
  cargas: number;
  m3: number;
  ventaM3: number;
  costoObjetivoM3: number;
  costoRealM3: number;
  margenM3: number;
  margenPct: number;
};

/** Costo real y margen por m³, receta por receta — ordenado de la más a la menos rentable. */
export function rentabilidadPorReceta(
  cargas: Carga[],
  p: Parametros,
): RentabilidadReceta[] {
  const mapa = new Map<
    string,
    { cargas: number; m3: number; costoReal: number; costoReceta: number; facturado: number; margen: number }
  >();
  for (const c of cargas) {
    const prev =
      mapa.get(c.receta) ??
      { cargas: 0, m3: 0, costoReal: 0, costoReceta: 0, facturado: 0, margen: 0 };
    mapa.set(c.receta, {
      cargas: prev.cargas + 1,
      m3: prev.m3 + Number(c.m3),
      costoReal: prev.costoReal + Number(c.costo_real),
      costoReceta: prev.costoReceta + Number(c.costo_receta),
      facturado: prev.facturado + Number(c.facturado),
      margen: prev.margen + Number(c.margen),
    });
  }
  return [...mapa.entries()]
    .map(([receta, v]) => ({
      receta,
      cargas: v.cargas,
      m3: v.m3,
      ventaM3: p.precio_venta_m3,
      costoObjetivoM3: v.m3 ? v.costoReceta / v.m3 : 0,
      costoRealM3: v.m3 ? v.costoReal / v.m3 : 0,
      margenM3: v.m3 ? v.margen / v.m3 : 0,
      margenPct: v.facturado ? (v.margen / v.facturado) * 100 : 0,
    }))
    .sort((a, b) => b.margenM3 - a.margenM3);
}

/** En qué se va el costo real: cemento vs áridos vs agua vs aditivo. */
export function composicionCosto(cargas: Carga[], p: Parametros) {
  let cemento = 0, aridos = 0, agua = 0, aditivo = 0;
  for (const c of cargas) {
    cemento += Number(c.cemento_real) * p.costo_cemento_kg;
    aridos += Number(c.aridos_real) * p.costo_arido_kg;
    agua += Number(c.agua_real) * p.costo_agua_l;
    aditivo += Number(c.aditivos_real) * p.costo_aditivo_kg;
  }
  const total = cemento + aridos + agua + aditivo || 1;
  return {
    cemento,
    aridos,
    agua,
    aditivo,
    total,
    pct: {
      cemento: (cemento / total) * 100,
      aridos: (aridos / total) * 100,
      agua: (agua / total) * 100,
      aditivo: (aditivo / total) * 100,
    },
  };
}
