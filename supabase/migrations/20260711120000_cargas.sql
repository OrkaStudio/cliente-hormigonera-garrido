-- Modelo de datos del monitoreo de planta.
-- Un registro por CARGA COMPLETA (batch), no por lectura del PLC.

create table if not exists parametros_costo (
  id                smallint primary key default 1,
  precio_venta_m3   numeric(12,2) not null,
  costo_cemento_kg  numeric(12,2) not null,
  costo_arido_kg    numeric(12,2) not null,
  costo_agua_l      numeric(12,2) not null,
  costo_aditivo_kg  numeric(12,2) not null,
  moneda            text not null default 'ARS',
  actualizado       timestamptz not null default now(),
  constraint parametros_costo_fila_unica check (id = 1)
);

create table if not exists cargas (
  id                 uuid primary key default gen_random_uuid(),
  batch_nro          integer not null,
  receta             text    not null,
  m3                 numeric(6,2) not null check (m3 > 0),

  fecha_hora_inicio  timestamptz not null,
  fecha_hora_fin     timestamptz not null,

  cemento_objetivo   numeric(10,2) not null,
  cemento_real       numeric(10,2) not null,
  agua_objetivo      numeric(10,2) not null,
  agua_real          numeric(10,2) not null,
  aridos_objetivo    numeric(10,2) not null,
  aridos_real        numeric(10,2) not null,
  aditivos_objetivo  numeric(10,2) not null,
  aditivos_real      numeric(10,2) not null,

  operador           text,
  creado_en          timestamptz not null default now(),

  -- El dato que vale: lo que la receta pedía vs lo que realmente entró.
  desvio_cemento  numeric(10,2) generated always as (cemento_real  - cemento_objetivo)  stored,
  desvio_agua     numeric(10,2) generated always as (agua_real     - agua_objetivo)     stored,
  desvio_aridos   numeric(10,2) generated always as (aridos_real   - aridos_objetivo)   stored,
  desvio_aditivos numeric(10,2) generated always as (aditivos_real - aditivos_objetivo) stored,

  duracion_min numeric(6,2) generated always as (
    extract(epoch from (fecha_hora_fin - fecha_hora_inicio)) / 60
  ) stored,

  constraint cargas_fin_posterior_al_inicio check (fecha_hora_fin >= fecha_hora_inicio)
);

create index if not exists cargas_fecha_idx  on cargas (fecha_hora_inicio desc);
create index if not exists cargas_receta_idx on cargas (receta);

-- Costo real de cada carga = material que REALMENTE entró x precio de hoy.
-- Es "real" y no teórico: si la planta sobredosifica cemento, acá se ve la plata.
create or replace view v_cargas_costo as
select
  c.*,
  round(c.cemento_real  * p.costo_cemento_kg
      + c.aridos_real   * p.costo_arido_kg
      + c.agua_real     * p.costo_agua_l
      + c.aditivos_real * p.costo_aditivo_kg, 2)                       as costo_real,
  round(c.cemento_objetivo  * p.costo_cemento_kg
      + c.aridos_objetivo   * p.costo_arido_kg
      + c.agua_objetivo     * p.costo_agua_l
      + c.aditivos_objetivo * p.costo_aditivo_kg, 2)                   as costo_receta,
  round(c.m3 * p.precio_venta_m3, 2)                                   as facturado,
  round(c.m3 * p.precio_venta_m3
      - (c.cemento_real  * p.costo_cemento_kg
       + c.aridos_real   * p.costo_arido_kg
       + c.agua_real     * p.costo_agua_l
       + c.aditivos_real * p.costo_aditivo_kg), 2)                     as margen
from cargas c
cross join parametros_costo p
where p.id = 1;

-- Demo: lectura pública. Cuando esto sea producción va con auth + RLS por rol
-- (José ve todo; el operador de Monte ve una vista acotada).
alter table cargas            enable row level security;
alter table parametros_costo  enable row level security;

create policy "demo lectura cargas"     on cargas           for select using (true);
create policy "demo lectura parametros" on parametros_costo for select using (true);

-- Las policies de RLS filtran filas, pero NO otorgan el permiso sobre la tabla:
-- sin estos GRANT, PostgREST responde 42501 (permission denied) igual.
grant select on cargas           to anon, authenticated;
grant select on parametros_costo to anon, authenticated;
grant select on v_cargas_costo   to anon, authenticated;

-- Node-RED (el que corre en la PC de la planta) escribe con service_role.
-- Es el ÚNICO que inserta: la app y el navegador solo leen.
grant insert on cargas to service_role;
grant select on cargas, parametros_costo, v_cargas_costo to service_role;
