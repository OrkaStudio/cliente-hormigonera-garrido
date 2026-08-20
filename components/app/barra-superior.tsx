import { cn } from '@/lib/utils';

const APARTADOS = [
  { nombre: 'Inicio', activo: true },
  { nombre: 'Cargas', activo: false },
  { nombre: 'Ventas', activo: false },
  { nombre: 'Clientes', activo: false },
  { nombre: 'Recetas', activo: false },
  { nombre: 'Stock', activo: false },
  { nombre: 'Rentabilidad', activo: false },
];

/**
 * La barra de la aplicación.
 *
 * En el celular no hay navegación: Inicio es la única pantalla que existe
 * y las demás todavía no se construyeron. Cuando aparezcan, esto pasa a
 * ser un menú — pero mostrar siete apartados muertos en una pantalla de
 * teléfono es ruido.
 */
export function BarraSuperior() {
  return (
    <header className="border-line bg-panel/85 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <span className="font-heading text-accent text-lg leading-none font-bold tracking-tight">
          HORMIMONTE
        </span>
        <span className="text-muted-foreground hidden text-sm sm:inline">
          Planta Monte · Ruta 3 y 41
        </span>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {APARTADOS.map((a) => (
            <span
              key={a.nombre}
              aria-current={a.activo ? 'page' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm',
                a.activo
                  ? 'text-ink border-ink border-b-2 font-medium'
                  : 'text-faint cursor-not-allowed'
              )}
              title={a.activo ? undefined : 'Todavía no construido'}
            >
              {a.nombre}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
