# Hormigonera Garrido

Plataforma de gestión para una planta de hormigón elaborado (Monte, Buenos Aires).

## Antes de tocar nada

La fuente de verdad **no está en este repo**. Está en el cerebro:
`orka-brain/clientes/hormigonera-jose/especificaciones/` — un archivo por
apartado, con el flujo, las reglas, los campos y el criterio de terminado.

Leer el apartado correspondiente antes de construirlo.

## Reglas del dominio que no se negocian

- **La app no manda sobre la planta.** El PLC es el centro; la plataforma
  replica, compara y avisa. Solo lectura, siempre.
- **Node-RED es el único que crea cargas.** Si el PLC no la produjo, no existe.
- **Nada fiscal.** Sin AFIP, sin CAE, sin cálculo de IVA. Los documentos dicen
  "comprobante comercial, no factura fiscal" impreso en el propio PDF.
- **El precio se congela en la venta.** Con esta inflación, recalcular el pasado
  convierte el historial en ficción.
- **El silencio es información.** Si no llegan datos no se muestra un cero: se
  muestra "hace X horas que no recibo datos de la planta".
- **Fuera de rango no se rechaza, se marca.** Si las direcciones Modbus se
  corren, la app tiene que gritar, no mostrar números creíbles y falsos.
- **Se rotula "margen de materiales"**, no "margen". No incluye sueldos,
  combustible ni mixer.

## Modelado

Los campos salen de las especificaciones, **no de las maquetas**. Las maquetas
son UI con números inventados y verosímiles.
Ver `orka-brain/lecciones/2026-04-gl-schema-desde-demo.md`.

## Estilos

Nunca escribir un hex ni un nombre de fuente en un componente. Todo sale de los
tokens semánticos de `app/globals.css`.

## Comandos: usar los específicos de RTK

RTK (el compresor de salida) está instalado con un hook que reescribe
cualquier `bash` a `rtk <comando>`. El problema es que `rtk pnpm` hace
**passthrough**: deja pasar la salida entera y no ahorra nada.

Los que comprimen de verdad son los específicos. Medido en este repo:

| En vez de | Usar | Ahorro |
| --- | --- | --- |
| `pnpm test` | `rtk vitest run` | 98% |
| `pnpm build` | `rtk next build` | 98% |
| `pnpm typecheck` | `rtk tsc --noEmit` | 71% |

Siguen mostrando lo que importa: con un test roto, `rtk vitest run`
devuelve `PASS (152) FAIL (1)` con el nombre del test, el error y la
línea. Sólo comprime cuando no hay nada que decir.

⚠️ **No confiar en el total de `rtk gain`.** El contador de vitest está
roto: informa ~1,3 M de tokens ahorrados donde la salida real son 290, y
eso arrastra el porcentaje global. Los renglones chicos (`ls`, `git
status`, `next build`) sí coinciden con lo medido a mano.

## No correr `pnpm build` con el dev server levantado

Rompe `.next` y el dev queda sirviendo CSS de 9 bytes y 404 en todas las
rutas. Pasó tres veces y cada una costó varios turnos de diagnóstico. Si
hace falta buildear, primero parar el dev.
