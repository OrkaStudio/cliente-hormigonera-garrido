# Hormigonera Garrido — plataforma de planta

Cliente de Orka Studio. Planta de hormigón elaborado en Monte, Buenos Aires.

## Qué es

El PLC produce, la carga se registra sola, alguien le pone cliente y precio, y
recién ahí es una venta. De ahí cuelgan documento, stock y rentabilidad.
Nueve apartados, cada uno con su especificación en el cerebro.

**La spec es la fuente:** `orka-brain/clientes/hormigonera-jose/especificaciones/`
(un archivo por apartado, más el mapa y las preguntas abiertas).

## Orden de construcción

No es el orden del menú. Es el orden de dependencias:

`2 Cargas → 5 Recetas → 4 Clientes → 3 Ventas → 6 Compras → 7 Stock → 8 Rentabilidad → 1 Inicio → 9 Config`

Cargas primero porque es el tronco. Inicio anteúltimo porque es el resumen de
todo lo demás.

## Stack

| Capa | Qué |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Mutaciones | Server Actions + ZSA |
| Validación | Zod |
| UI | Tailwind v4 + shadcn/ui |
| Deploy | Vercel |

## Tokens

`app/globals.css` tiene la paleta en dos capas: `@theme inline` define los
**nombres** semánticos, `:root` define los **valores** de este cliente. Los
componentes consumen nombres, nunca hex. Cuando aterrice el design system de
Orka, lo que cambia es el bloque `:root`.

Los valores actuales están portados de las maquetas
(`orka-brain/clientes/hormigonera-jose/assets/apartados-garrido-2026-08-18.html`)
y son **provisorios**.

## Estado

Andamiaje. Sin pantallas reales todavía.

El acceso a los datos del PLC (Modbus vía HMI) sigue sin confirmar y es el
bloqueante del proyecto — pero **no bloquea la construcción**: todo se levanta
con datos sembrados a mano. La única pantalla donde la respuesta del ingeniero
cambia el diseño es Cargas, y lo que cambia es la granularidad de la fila.

## Arranque local

```bash
pnpm install
cp .env.example .env.local   # completar con las claves de Supabase
pnpm dev
```
