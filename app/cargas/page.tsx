import { redirect } from 'next/navigation';

/**
 * Cargas se fusionó con Ventas.
 *
 * Eran dos pantallas para la misma pregunta: una listaba los pastones y
 * la otra los mismos pastones agrupados. Ahora la venta es el renglón y
 * el pastón su detalle → decisiones/hormigonera-la-venta-es-el-dia
 *
 * La ruta queda redirigiendo porque estuvo en producción y hay links
 * viejos —el mail de la alerta, el navegador de José— que la apuntan.
 */
export default function CargasRedirige() {
  redirect('/ventas');
}
