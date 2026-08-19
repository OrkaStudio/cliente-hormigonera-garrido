/**
 * Tipos globales de la aplicación.
 * REGLA: Los tipos de dominio se infieren desde schemas Zod en /validations.
 * Este archivo es para tipos utilitarios y globales únicamente.
 *
 * Ejemplo de uso correcto:
 *   import { userSchema } from '@/validations/user.schema'
 *   export type User = z.infer<typeof userSchema>
 */

/** Respuesta estándar de Server Actions */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/** Estado de carga genérico */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
