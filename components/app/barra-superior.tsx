'use client';

import { EMPRESA } from '@/config/empresa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * La barra de la aplicación.
 *
 * Los apartados construidos son links de verdad y se ven siempre,
 * también en el teléfono: desde que existe una segunda pantalla, no
 * mostrarlos ahí deja al que abre desde el auto sin manera de llegar.
 *
 * Los que todavía no existen siguen siendo etiquetas muertas y siguen
 * escondidos abajo de `lg`. Son cinco carteles que no llevan a ningún
 * lado — en una pantalla de teléfono eso es ruido, no un menú.
 */
const APARTADOS = [
  { nombre: 'Inicio', href: '/' },
  { nombre: 'Cargas', href: null },
  { nombre: 'Ventas', href: null },
  { nombre: 'Clientes', href: '/clientes' },
  { nombre: 'Recetas', href: null },
  { nombre: 'Stock', href: null },
  { nombre: 'Rentabilidad', href: null },
] as const;

export function BarraSuperior() {
  const ruta = usePathname();

  return (
    <header className="border-line bg-panel/85 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-accent text-lg leading-none font-bold tracking-tight"
        >
          {EMPRESA.marca}
        </Link>
        <span className="text-muted-foreground hidden text-sm xl:inline">{EMPRESA.planta}</span>

        <nav className="ml-auto flex items-center gap-1">
          {APARTADOS.map((a) => {
            if (!a.href) {
              return (
                <span
                  key={a.nombre}
                  className="text-faint hidden cursor-not-allowed rounded-md px-2.5 py-1.5 text-sm lg:inline"
                  title="Todavía no construido"
                >
                  {a.nombre}
                </span>
              );
            }

            const activo = a.href === '/' ? ruta === '/' : ruta.startsWith(a.href);
            return (
              <Link
                key={a.nombre}
                href={a.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-sm',
                  activo
                    ? 'text-ink border-ink border-b-2 font-medium'
                    : 'text-ink-soft hover:text-ink',
                )}
              >
                {a.nombre}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
