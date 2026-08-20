'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mantiene Inicio al día sin que nadie toque nada.
 *
 * ── Hoy ────────────────────────────────────────────────────────────────
 * No hay proyecto de Supabase, así que no hay a qué suscribirse. Mientras
 * tanto refresca por intervalo y cuando la pestaña vuelve a primer plano —
 * que cubre el uso real: José deja la pantalla abierta o vuelve a la app
 * cada tanto.
 *
 * ── Cuando exista Supabase ─────────────────────────────────────────────
 * Se reemplaza el intervalo por una suscripción de Realtime a la tabla
 * `cargas`. La costura es exactamente este componente: `router.refresh()`
 * ya vuelve a correr el Server Component, así que lo único que cambia es
 * QUÉ lo dispara.
 *
 *   const supabase = await createRealtimeClient();
 *   const canal = supabase
 *     .channel('cargas-inicio')
 *     .on('postgres_changes',
 *         { event: '*', schema: 'public', table: 'cargas' },
 *         () => router.refresh())
 *     .subscribe();
 *   return () => { void supabase.removeChannel(canal); };
 *
 * ⚠️ Tres cosas que ya nos costaron caro en Gestiones Laborales
 * (orka-brain/lecciones/2026-05-gl-supabase-realtime-anon-jwt.md):
 *
 *  1. `createBrowserClient` conecta el socket como `anon` aunque haya
 *     sesión. Hay que llamar `realtime.setAuth(session.access_token)`
 *     ANTES de `.subscribe()`, o el canal dice SUBSCRIBED y no llega nada.
 *  2. Realtime filtra por RLS: la tabla necesita RLS habilitada para
 *     emitir. Sin RLS no manda eventos.
 *  3. **Jamás** destrabar esto con una policy de SELECT para `anon`. En GL
 *     esa "solución" dejó la PII de 73 personas legible con la anon key del
 *     bundle, sin login. La policy va para `authenticated`.
 */

/** Cada cuánto refrescar mientras no haya Realtime. */
const INTERVALO_MS = 60_000;

export function ActualizacionEnVivo() {
  const router = useRouter();
  const [ultima, setUltima] = useState<Date | null>(null);

  useEffect(() => {
    const refrescar = () => {
      router.refresh();
      setUltima(new Date());
    };

    const id = setInterval(refrescar, INTERVALO_MS);

    // Volver a la pestaña después de un rato es el caso más común: no
    // tiene sentido mostrar los números de hace media hora.
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [router]);

  return (
    <span className="text-faint inline-flex items-center gap-1.5 text-xs" role="status">
      <span className="bg-ok inline-block size-1.5 shrink-0 rounded-full" aria-hidden />
      {ultima
        ? `Actualizado ${ultima.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : 'En vivo'}
    </span>
  );
}
