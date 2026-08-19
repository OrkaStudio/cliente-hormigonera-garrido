/**
 * config/site.ts
 * ─────────────────────────────────────────────────────────────
 * Datos de identidad del cliente. Único archivo que cambia por cliente.
 */

export const siteConfig = {
  name: "Hormigonera Garrido",
  description:
    "Plataforma de gestión de planta — producción, ventas, stock y rentabilidad.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: "/logo.svg",
  links: {
    github: "https://github.com/OrkaStudio/cliente-hormigonera-garrido",
    instagram: "",
    whatsapp: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
