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
