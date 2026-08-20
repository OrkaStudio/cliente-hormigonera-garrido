/**
 * Los números que gobiernan las alertas, en un solo lugar.
 *
 * Esto es el apartado 9 (Configuración) antes de que exista: cuando se
 * construya, sale de la base y deja de vivir acá. Mientras tanto, que
 * estén todos juntos evita que el umbral de calibración se cambie en una
 * pantalla y el de stock en otra.
 *
 * ⚠️ PROVISORIOS. Ninguno está confirmado con José ni con el ingeniero
 * de GENROD. Las preguntas abiertas correspondientes:
 *   - ¿Cuántas horas sin datos del PLC son sospechosas?   → interna
 *   - ¿Qué desvío considera "para mandar a calibrar"?     → 3.4 (José)
 *   - ¿Con cuánta anticipación quiere el aviso de stock?  → 7 (José)
 */
export const UMBRALES = {
  /** Desvío promedio, en %, a partir del cual se manda a calibrar. */
  desvioParaCalibrar: 1.5,

  /** Cuántas cargas entran en cada ventana de la comparación de tendencia. */
  ventanaCargas: 10,

  /**
   * Cuánto tiene que crecer el desvío entre una ventana y la siguiente,
   * en puntos porcentuales, para considerarlo tendencia y no ruido.
   */
  crecimientoMinimo: 0.15,

  /** Horas sin recibir una carga del PLC antes de avisar. */
  horasSinDatos: 4,

  /** Días de stock restante que disparan el aviso de reposición. */
  diasParaReponer: 5,
} as const;
