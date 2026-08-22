import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

/**
 * Las tres familias que declaran los tokens de globals.css.
 * next/font las auto-hostea en build: sin request a Google en runtime.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/**
 * El icono de la pestaña.
 *
 * Es la H de Hormimonte en el rojo y el negro que ya están muestreados
 * del logo — no una identidad nueva. Existe para que la aplicación deje
 * de pedir un favicon que no está: era el único 404 que quedaba. Cuando
 * llegue el archivo del logo de verdad, se reemplaza.
 */
export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
