import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planta Monte — Monitoreo de cargas",
  description: "Cada carga de la planta, desde donde estés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-stone-300/70 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-lg">
                🏗️
              </div>
              <div>
                <p className="text-sm leading-tight font-semibold">Planta Monte</p>
                <p className="text-xs leading-tight text-stone-500">
                  Monitoreo de cargas
                </p>
              </div>
            </div>

            <nav className="flex gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
              >
                Resumen
              </Link>
              <Link
                href="/cargas"
                className="rounded-md px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
              >
                Historial de cargas
              </Link>
              <Link
                href="/rentabilidad"
                className="rounded-md px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
              >
                Rentabilidad
              </Link>
              <Link
                href="/clientes"
                className="rounded-md px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
              >
                Clientes
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-2 text-sm text-stone-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Planta conectada
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
