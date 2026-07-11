-- Datos de DEMO — jornadas verosímiles, NO son datos reales de la planta de José.
-- Precios estimados de mercado (ARS, julio 2026). Se ajustan cuando José pase los suyos.

insert into parametros_costo (id, precio_venta_m3, costo_cemento_kg, costo_arido_kg, costo_agua_l, costo_aditivo_kg)
values (1, 180000, 180, 35, 2, 2500)
on conflict (id) do update set
  precio_venta_m3  = excluded.precio_venta_m3,
  costo_cemento_kg = excluded.costo_cemento_kg,
  costo_arido_kg   = excluded.costo_arido_kg,
  costo_agua_l     = excluded.costo_agua_l,
  costo_aditivo_kg = excluded.costo_aditivo_kg;

truncate cargas;

-- Semilla fija: el demo da siempre los mismos números (se puede ensayar la reunión).
select setseed(0.42);

with recetas(receta, cemento_m3, agua_m3, aridos_m3, peso) as (
  values
    ('H13',        230.0, 155.0, 1950.0, 1),
    ('H17',        260.0, 158.0, 1940.0, 2),
    ('H21',        284.0, 160.0, 1930.0, 3),
    ('H21 BOMBA',  300.0, 172.0, 1900.0, 3),
    ('H25',        320.0, 162.0, 1920.0, 2),
    ('H30',        350.0, 165.0, 1900.0, 1)
),
dias as (
  select d::date as dia
  from generate_series('2026-05-31'::date, '2026-07-11'::date, '1 day') d
  where extract(isodow from d) <= 6      -- lunes a sábado
),
batches as (
  select
    dia,
    b as batch_del_dia,
    random() as r_receta,
    random() as r_m3,
    random() as r_dur,
    random() as r_cem,
    random() as r_agua,
    random() as r_arid,
    random() as r_adit,
    random() as r_op
  from dias,
       lateral generate_series(
         1,
         case when extract(isodow from dia) = 6
              then 4 + floor(random() * 4)::int      -- sábado: 4-7 cargas
              else 8 + floor(random() * 9)::int      -- lun-vie: 8-16 cargas
         end
       ) b
),
-- Receta ponderada con UN solo sorteo, y sus proporciones reales.
-- H21 y H21 BOMBA son las que más sale la planta.
resuelto as (
  select
    b.dia, b.batch_del_dia, r.receta,
    r.cemento_m3, r.agua_m3, r.aridos_m3,
    b.r_m3, b.r_dur, b.r_cem, b.r_agua, b.r_arid, b.r_adit, b.r_op
  from batches b
  join recetas r on r.receta = case
      when b.r_receta < 0.08 then 'H13'
      when b.r_receta < 0.26 then 'H17'
      when b.r_receta < 0.58 then 'H21'
      when b.r_receta < 0.82 then 'H21 BOMBA'
      when b.r_receta < 0.94 then 'H25'
      else                        'H30'
    end
),
calculado as (
  select
    dia,
    batch_del_dia,
    receta,
    -- camiones de 6 a 8 m3, y algún batch chico de completar
    round((case when r_m3 < 0.15 then 1.5 + r_m3 * 6 else 6.0 + r_m3 * 2 end)::numeric, 1) as m3,
    cemento_m3, agua_m3, aridos_m3,
    r_dur, r_cem, r_agua, r_arid, r_adit, r_op
  from resuelto
),
final as (
  select
    row_number() over (order by dia, batch_del_dia) as batch_nro,
    receta,
    m3,
    -- la planta arranca 7:30 y saca un camión cada ~25-45 min
    (dia + time '07:30' + ((batch_del_dia - 1) * interval '32 minutes')
         + (r_dur * interval '14 minutes'))::timestamptz as inicio,
    round((3.5 + r_dur * 3)::numeric, 1) as dur_min,

    round((cemento_m3 * m3)::numeric, 0) as cemento_objetivo,
    round((agua_m3    * m3)::numeric, 0) as agua_objetivo,
    round((aridos_m3  * m3)::numeric, 0) as aridos_objetivo,
    round((cemento_m3 * m3 * 0.005)::numeric, 2) as aditivos_objetivo,

    r_cem, r_agua, r_arid, r_adit, r_op
  from calculado
)
insert into cargas (
  batch_nro, receta, m3, fecha_hora_inicio, fecha_hora_fin,
  cemento_objetivo, cemento_real,
  agua_objetivo, agua_real,
  aridos_objetivo, aridos_real,
  aditivos_objetivo, aditivos_real,
  operador
)
select
  batch_nro,
  receta,
  m3,
  inicio,
  inicio + (dur_min * interval '1 minute'),

  cemento_objetivo,
  -- ⚠️ LA HISTORIA DEL DEMO: la balanza de cemento sobredosifica siempre.
  -- Entre +1.2% y +2.6% en cada batch. Nadie lo ve porque la pantalla del HMI
  -- muestra el número y se va; solo aparece cuando lo acumulás.
  round((cemento_objetivo * (1.012 + r_cem * 0.014))::numeric, 0),

  agua_objetivo,
  round((agua_objetivo   * (0.99 + r_agua * 0.02))::numeric, 0),   -- ruido normal ±1%
  aridos_objetivo,
  round((aridos_objetivo * (0.995 + r_arid * 0.01))::numeric, 0),  -- ruido normal ±0.5%
  aditivos_objetivo,
  round((aditivos_objetivo * (0.98 + r_adit * 0.04))::numeric, 2),

  case when r_op < 0.55 then 'Ramón' else 'Cacho' end
from final;
