'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BarraSuperior } from '@/components/app/barra-superior';
import { AsignarCargas } from '@/components/app/asignar-cargas';
import { CicloEnVivo } from '@/components/cargas/ciclo-en-vivo';
import { BarraDesvio } from '@/components/dominio/barra-desvio';
import { Estado, MarcaFiscalDeVenta } from '@/components/dominio/estado';
import { EstadoVacio } from '@/components/dominio/estado-vacio';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { asignarLocal, aplicarAsignaciones, leerAsignaciones } from '@/lib/datos/cargas-locales';
import type { DatosCargas } from '@/lib/datos/cargas';
import type { CicloPlc } from '@/lib/dominio/plc';
import type { Carga } from '@/lib/datos/tipos';
import { $, dec, fechaDeMomento, hora, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Apartado 2 — Cargas. El tronco del sistema.
 *
 * Spec: orka-brain/clientes/hormigonera-jose/especificaciones/
 *       2026-08-18-apartado-2-cargas.md
 *
 * Dos cosas que la spec pide y que ordenan toda la pantalla:
 *
 *  · R1 — Node-RED es el ÚNICO que crea cargas. Acá no hay botón de
 *    "nueva carga" y no lo va a haber: si el PLC no la produjo, no
 *    existe. Por eso arriba está la planta y no un formulario.
 *  · R4 — una carga sin cliente es visible y molesta. Van primero, sobre
 *    fondo propio, antes que cualquier número del día.
 */
export function PanelCargas({ datos: d }: { datos: DatosCargas }) {
  const router = useRouter();
  const [sinCliente, setSinCliente] = useState<Carga[]>(d.sinCliente);
  const [delDia, setDelDia] = useState<Carga[]>(d.delDia);
  const [reciennacida, setRecienNacida] = useState<string | null>(null);

  // Las asignaciones hechas en este navegador se aplican después de
  // montar: en el servidor no existe localStorage.
  useEffect(() => {
    const asig = leerAsignaciones();
    const conAsignaciones = aplicarAsignaciones(d.delDia, asig);
    setDelDia(conAsignaciones);
    setSinCliente(conAsignaciones.filter((c) => !c.clienteId && c.estado !== 'anulada'));
  }, [d.delDia]);

  /**
   * Cerró un ciclo del PLC: nace la carga.
   *
   * Esto es lo que hoy hace Node-RED contra la base. Se hace acá sólo
   * para poder verlo — el día que el enlace esté vivo, la carga va a
   * llegar por Realtime y esta función desaparece.
   */
  function alCerrarCiclo(ciclo: CicloPlc) {
    const nueva: Carga = {
      id: `C-${ciclo.batch}`,
      momento: new Date().toISOString(),
      receta: ciclo.receta,
      m3: ciclo.m3,
      clienteId: null,
      estado: 'registrada',
      total: 0,
      montoFacturado: null,
      pesadas: ciclo.dosificacion
        .filter((x) => x.material !== 'Agua' && x.material !== 'Aditivo')
        .map((x) => ({
          material: x.material === 'Áridos' ? 'Arena' : x.material,
          receta: x.objetivo,
          objetivo: x.objetivo,
          real: Math.round(x.real),
        })),
    };

    setDelDia((prev) => [nueva, ...prev]);
    setSinCliente((prev) => [nueva, ...prev]);
    setRecienNacida(nueva.id);
    setTimeout(() => setRecienNacida((v) => (v === nueva.id ? null : v)), 2400);
  }

  function asignar(cargaId: string, clienteId: string, total: number) {
    asignarLocal(cargaId, clienteId, total);
    setSinCliente((prev) => prev.filter((c) => c.id !== cargaId));
    setDelDia((prev) =>
      prev.map((c) => (c.id === cargaId ? { ...c, clienteId, total, estado: 'asignada' } : c)),
    );
    router.refresh();
  }

  const m3Dia = delDia.reduce((a, c) => a + c.m3, 0);

  return (
    <>
      <BarraSuperior activo="Cargas" />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              Cargas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Las escribe el autómata. Acá se les pone cliente.
            </p>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          {/* La planta primero: es de donde viene todo lo demás. */}
          <div className="grid gap-4">
            <CicloEnVivo onCargaTerminada={alCerrarCiclo} />

            <div className="grid grid-cols-2 gap-3">
              <TarjetaKpi rotulo="Cargas de hoy" valor={num(delDia.length)} pie="del autómata" />
              <TarjetaKpi rotulo="Producción" valor={dec(m3Dia)} unidad="m³" pie="del día" />
            </div>
          </div>

          <div className="grid gap-6">
            {/* R4 — molesta a propósito: va antes que los números. */}
            <section
              className={cn(
                'rounded-xl border p-4 transition-colors',
                sinCliente.length > 0
                  ? 'border-warn/40 bg-warn-soft'
                  : 'border-line bg-panel',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                  Esperando cliente
                </h2>
                {sinCliente.length > 0 && (
                  <span className="text-warn-text font-mono text-xs tabular-nums">
                    {dec(sinCliente.reduce((a, c) => a + c.m3, 0))} m³ sin imputar
                  </span>
                )}
              </div>

              <div className="mt-2">
                <AsignarCargas
                  cargas={sinCliente}
                  clientes={d.clientes}
                  onAsignar={asignar}
                />
              </div>
            </section>

            <section>
              <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Hoy
              </h2>

              {delDia.length === 0 ? (
                <div className="mt-3">
                  <EstadoVacio
                    titulo="Todavía no se produjo"
                    descripcion="Cuando el PLC cierre el primer ciclo, la carga aparece acá sola."
                  />
                </div>
              ) : (
                <ul className="border-line bg-panel divide-line mt-3 divide-y overflow-hidden rounded-xl border">
                  {delDia.map((c) => (
                    <FilaCarga key={c.id} carga={c} nueva={reciennacida === c.id} />
                  ))}
                </ul>
              )}
            </section>

            {d.recientes.length > 0 && (
              <section>
                <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
                  Días anteriores
                </h2>
                <ul className="border-line bg-panel divide-line mt-3 divide-y overflow-hidden rounded-xl border">
                  {d.recientes.map((c) => (
                    <FilaCarga key={c.id} carga={c} conFecha />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function FilaCarga({
  carga: c,
  nueva = false,
  conFecha = false,
}: {
  carga: Carga;
  nueva?: boolean;
  conFecha?: boolean;
}) {
  const cemento = c.pesadas.find((p) => p.material === 'Cemento');

  return (
    <li
      className={cn(
        'grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 p-3 sm:grid-cols-[auto_auto_1fr_5rem_7rem_auto]',
        nueva && 'zona-cambiada',
        !c.clienteId && 'bg-warn-wash',
      )}
    >
      <span className="text-muted-foreground font-mono text-xs whitespace-nowrap tabular-nums">
        {conFecha && <span className="text-faint mr-1.5">{fechaDeMomento(c.momento)}</span>}
        {hora(c.momento)}
      </span>

      <span className="text-faint hidden font-mono text-xs sm:inline">{c.id}</span>

      <span className="min-w-0 truncate text-sm">
        <span className="font-mono font-medium">{c.receta}</span>
        <span className="text-faint mx-1.5">·</span>
        <span className="tabular-nums">{dec(c.m3)} m³</span>
      </span>

      <span className="hidden sm:block" title="Desvío del cemento">
        {cemento && <BarraDesvio objetivo={cemento.objetivo} real={cemento.real} />}
      </span>

      <span className="text-right text-sm tabular-nums">
        {c.total ? $(c.total) : <span className="text-faint">—</span>}
      </span>

      <span className="justify-self-end">
        {c.clienteId ? (
          <MarcaFiscalDeVenta venta={c} />
        ) : (
          <Estado tono="warn">Sin cliente</Estado>
        )}
      </span>
    </li>
  );
}
