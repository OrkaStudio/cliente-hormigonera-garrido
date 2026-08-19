/**
 * config/features.ts
 * ─────────────────────────────────────────────────────────────
 * Feature flags por cliente / vertical.
 * Activá solo los módulos que corresponden al tipo de negocio.
 *
 * Uso en componentes:
 *   import { features } from "@/config/features"
 *   if (features.hasContracts) { ... }
 */

export const features = {
  // ── Vertical: Inmobiliaria ────────────────────────────────
  /** Gestión de contratos de alquiler */
  hasContracts: false,
  /** Administración de propiedades */
  hasProperties: false,
  /** Gestión de inquilinos */
  hasTenants: false,

  // ── Vertical: Comercio / Ropa ─────────────────────────────
  /** Inventario de productos */
  hasInventory: false,
  /** Gestión de proveedores */
  hasSuppliers: false,
  /** Punto de venta / caja */
  hasPOS: false,

  // ── Vertical: Restaurante ─────────────────────────────────
  /** Gestión de mesas y pedidos */
  hasTableManagement: false,
  /** Carta / menú digital */
  hasMenu: false,

  // ── Features transversales ────────────────────────────────
  /** Integración con Stripe para pagos / suscripciones */
  hasBilling: false,
  /** Reportes y analytics del negocio */
  hasReports: false,
  /** Notificaciones por email (Resend) */
  hasEmailNotifications: false,
} as const;

export type Features = typeof features;
