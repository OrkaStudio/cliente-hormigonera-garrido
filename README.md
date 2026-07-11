# Planta Monte — monitoreo de cargas (demo)

Demo para la reunión con José. Lee el HMI por Modbus, guarda **una fila por carga
terminada** y muestra producción, desvíos y rentabilidad.

Contexto, decisiones y precio: ver el cerebro (`clientes/hormigonera-jose/`).

## Cómo levantar el demo

Todo corre **en la notebook**, sin depender de internet. En este orden:

```bash
# 1. Base de datos (Docker)
npx supabase start
npx supabase db reset          # migración + 6 semanas de producción

# 2. La app
npx next build && npx next start     # http://localhost:3000
```

3. **Node-RED** (solo para el acto 1): `npx node-red` → `http://localhost:1880` →
   importar `node-red/flows.json`. Y abrir **ModbusTools / Modbus Slave** (`mbslave.exe`):
   TCP, puerto 502, Slave ID 1, Holding Register, address 0, quantity 30.

> ⚠️ El dev server (`npm run dev`) **no ve los cambios de archivos en `/mnt/d`**: WSL no
> emite eventos de inotify en discos montados, así que Turbopack sirve una versión vieja
> (incluso ignora rutas nuevas). Para desarrollar, reiniciarlo tras cada edición. Para la
> reunión, usar el build de producción.

## El guion de la reunión

**Acto 1 — de dónde sale el dato (2 minutos).** Simulador Modbus al lado de la app. En el
simulador, poner el registro 20 (estado del proceso) en `1` (automático) y después en `0`
(parado): eso es el ciclo terminando. Node-RED detecta ese flanco, arma la carga y la
postea. Refrescás la app y la carga está ahí. Después cerrás el simulador y no lo abrís más.

**Acto 2 — el producto (el resto de la reunión).** Resumen del día → el cartel rojo del
desvío de cemento → historial. Que José vea su planta, no un tablero de ingeniería.

## Dónde está cada cosa

| Ruta | Qué es |
|---|---|
| `supabase/migrations/` | Tabla `cargas` (los desvíos y la duración los calcula la DB) + `parametros_costo` + vista `v_cargas_costo` (costo real, facturado, margen) |
| `supabase/seed.sql` | 6 semanas de producción verosímil. Semilla fija: los números **no cambian** entre el ensayo y la reunión |
| `node-red/flows.json` | Modbus → detección de fin de carga → POST a Supabase |
| `app/page.tsx` | Resumen del día |
| `app/cargas/page.tsx` | Historial completo |

## Qué es real y qué no

- **Real:** la cadena entera (Modbus → Node-RED → Supabase → app), el modelo de datos, y
  que el desvío se calcule contra la receta.
- **Inventado:** las cargas del seed y el **mapa de registros Modbus** que usa `flows.json`.
  El mapa real lo tiene GENROD — es el bloqueante del proyecto.
- **Estimados:** los precios (cemento $180/kg, venta $180.000/m³). Viven en una sola fila
  (`parametros_costo`): cuando José pase los suyos, se cambia esa fila y **todos los números
  de la app se recalculan**.

## La historia que cuentan los datos

La balanza de cemento sobredosifica ~1,9% en cada carga. En la pantalla del HMI eso no se
ve: el número pasa y se va. Acumulado en 6 semanas son **14.003 kg de cemento regalado
≈ $2.520.540** — más de lo que José gasta en un mes de viajes.

Ese es el argumento: esto no es un monitor, es plata que hoy se va sin que nadie la vea.
