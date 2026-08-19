import { siteConfig } from "@/config/site";

/**
 * Placeholder. La primera pantalla real es Cargas (apartado 2) —
 * es el tronco del que cuelga todo el resto.
 * Ver clientes/hormigonera-jose/especificaciones/ en orka-brain.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Orka Studio
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-muted-foreground">{siteConfig.description}</p>
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Andamiaje listo. La construccion arranca por{" "}
        <span className="text-foreground">2 · Cargas</span>, sigue por Recetas y
        Clientes.
      </div>
    </main>
  );
}
