import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EMPRESA } from '@/config/empresa';

const APARTADOS = [
  { nombre: 'Inicio', href: '/' as const, activo: true },
  { nombre: 'Cargas', href: '/cargas' as const, activo: false },
  { nombre: 'Ventas', href: '/ventas' as const, activo: false },
  { nombre: 'Clientes', href: '/clientes' as const, activo: false },
  { nombre: 'Materiales', href: '/materiales' as const, activo: false },
  { nombre: 'Rentabilidad', href: '/rentabilidad' as const, activo: false },
];

/**
 * La barra de la aplicación.
 *
 * El hilo rojo de arriba y el apartado activo en rojo son los dos únicos
 * lugares donde el color de marca aparece fuera de un estado. El sistema
 * lo autoriza explícitamente para "logotipo, navegación activa y anillo
 * de foco": no compite con el semáforo porque nunca cae adentro de los
 * datos.
 */
export function BarraSuperior({ activo = 'Inicio' }: { activo?: string }) {
  return (
    <header className="border-line bg-panel/90 sticky top-0 z-20 border-b backdrop-blur">
      {/* Un hilo de marca. Cuesta 2 px y le pone cara a la aplicación. */}
      <div className="bg-marca h-[3px]" />

      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Va como <img> y no inline: el trazado pesa 76 KB y meterlo en
              el arbol de React lo manda en el payload de CADA pagina. Asi
              es un pedido solo, cacheado, y comprimido son 25 KB. */}
          <img src="/marca/isotipo.svg" alt="" className="h-7 w-auto shrink-0" />
          <span className="font-heading text-marca text-lg leading-none font-black tracking-tight">
            {EMPRESA.marca}
          </span>
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {EMPRESA.planta}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
          {APARTADOS.map((a) => {
            const esActivo = a.nombre === activo;
            const clase = cn(
              'relative rounded-md px-2.5 py-1.5 text-sm transition-colors',
              esActivo
                ? 'text-ink font-semibold'
                : a.href
                  ? 'text-muted-foreground hover:text-ink hover:bg-sunk'
                  : 'text-faint cursor-not-allowed',
            );

            const contenido = (
              <>
                {a.nombre}
                {esActivo && (
                  <span className="bg-marca absolute inset-x-2.5 -bottom-px h-0.5 rounded-full" />
                )}
              </>
            );

            return a.href && !esActivo ? (
              <Link key={a.nombre} href={a.href} className={clase}>
                {contenido}
              </Link>
            ) : (
              <span
                key={a.nombre}
                aria-current={esActivo ? 'page' : undefined}
                className={clase}
                title={a.href || esActivo ? undefined : 'Todavía no construido'}
              >
                {contenido}
              </span>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
