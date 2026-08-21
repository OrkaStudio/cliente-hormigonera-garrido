'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MATERIALES_PLC,
  ROTULO_ESTADO,
  desvioDosificacion,
  type CicloPlc,
  type DosificacionEnCurso,
  type EstadoPlc,
} from '@/lib/dominio/plc';
import { num } from '@/lib/formato';

/**
 * La planta, mientras trabaja.
 *
 * Es la pantalla que José no tiene hoy: para saber si la planta está
 * produciendo hay que llamar a Monte y preguntar. Acá se ve el ciclo
 * corriendo — qué receta, cuántos m³, y cada material llenándose contra
 * su objetivo.
 *
 * Lo que se ve mientras el estado es "automático" NO es una carga: es una
 * dosificación en curso. La carga nace recién en la transición a parado,
 * que es exactamente donde el flujo de Node-RED la crea. Mientras tanto
 * no le suma a nadie y no se puede asignar.
 *
 * ⚠️ Hoy el ciclo se simula en el navegador para poder verlo. Cuando
 * Node-RED esté conectado, el estado va a llegar por Realtime y esto pasa
 * a ser sólo la vista.
 */

const RECETAS = [
  { nombre: 'H-21', cemento: 284, agua: 160, aridos: 1930 },
  { nombre: 'H-25', cemento: 320, agua: 162, aridos: 1920 },
  { nombre: 'H-30', cemento: 350, agua: 165, aridos: 1900 },
];

/** Cuánto dura un ciclo en pantalla. El real ronda los 5 minutos. */
const DURACION_MS = 22_000;
const PAUSA_ENTRE_CICLOS_MS = 7_000;

/** El cemento entra primero y el aditivo último, como en la planta. */
const ORDEN: Record<string, [number, number]> = {
  Cemento: [0, 0.45],
  Áridos: [0.15, 0.7],
  Agua: [0.5, 0.9],
  Aditivo: [0.75, 1],
};

function nuevoCiclo(batch: number): CicloPlc {
  const r = RECETAS[Math.floor(Math.random() * RECETAS.length)]!;
  const m3 = Math.round((6 + Math.random() * 2) * 10) / 10;
  const sesgo = 0.019; // la caída libre del cemento, mal afinada

  return {
    batch,
    estado: 'automatico',
    receta: r.nombre,
    m3,
    arranque: new Date().toISOString(),
    avance: 0,
    dosificacion: [
      { material: 'Cemento', objetivo: Math.round(r.cemento * m3), real: 0, unidad: 'kg' },
      { material: 'Áridos', objetivo: Math.round(r.aridos * m3), real: 0, unidad: 'kg' },
      { material: 'Agua', objetivo: Math.round(r.agua * m3), real: 0, unidad: 'L' },
      {
        material: 'Aditivo',
        objetivo: Math.round(r.cemento * m3 * 0.005 * 10) / 10,
        real: 0,
        unidad: 'kg',
      },
    ].map((d) => ({ ...d, sesgo: d.material === 'Cemento' ? sesgo : 0 })) as DosificacionEnCurso[],
  };
}

export function CicloEnVivo({
  onCargaTerminada,
}: {
  onCargaTerminada?: (ciclo: CicloPlc) => void;
}) {
  const [ciclo, setCiclo] = useState<CicloPlc | null>(null);
  const [estado, setEstado] = useState<EstadoPlc>('parado');
  // Arranca por encima del ultimo correlativo sembrado: si empieza en el
  // mismo numero, la carga nueva colisiona con una que ya esta en la
  // lista y React se queda con una sola.
  const batch = useRef(9000);
  const terminada = useRef(onCargaTerminada);
  terminada.current = onCargaTerminada;

  useEffect(() => {
    let vivo = true;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;

    function arrancar() {
      if (!vivo) return;
      batch.current += 1;
      const c = nuevoCiclo(batch.current);
      const desde = performance.now();
      setCiclo(c);
      setEstado('automatico');

      const tick = () => {
        if (!vivo) return;
        const t = Math.min((performance.now() - desde) / DURACION_MS, 1);

        const avanzado: CicloPlc = {
          ...c,
          avance: t,
          dosificacion: c.dosificacion.map((d) => {
            const [ini, fin] = ORDEN[d.material] ?? [0, 1];
            const p = Math.min(Math.max((t - ini) / (fin - ini), 0), 1);
            // El cemento cierra 1,9% por encima del objetivo: es el
            // hallazgo del demo, y acá se ve pasar en vivo.
            const tope = d.material === 'Cemento' ? 1.019 : 1;
            return { ...d, real: Math.round(d.objetivo * p * tope * 10) / 10 };
          }),
        };
        setCiclo(avanzado);

        if (t < 1) {
          raf = requestAnimationFrame(tick);
          return;
        }

        // Automático → parado: acá, y sólo acá, nace la carga. El aviso
        // va FUERA del updater de estado: adentro corría durante el
        // render de otro componente, que es lo que React avisa.
        setEstado('parado');
        terminada.current?.({ ...avanzado, estado: 'parado', avance: 1 });
        timer = setTimeout(arrancar, PAUSA_ENTRE_CICLOS_MS);
      };

      raf = requestAnimationFrame(tick);
    }

    timer = setTimeout(arrancar, 1200);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  const dosificando = estado === 'automatico';

  return (
    <section
      className={cn(
        'rounded-xl border p-4 transition-colors',
        dosificando ? 'border-plc/30 bg-plc-soft' : 'border-line bg-panel',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
          La planta ahora
        </h2>

        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-xs',
            dosificando ? 'text-plc-text' : 'text-faint',
          )}
          role="status"
        >
          <span
            className={cn(
              'inline-block size-2 rounded-full',
              dosificando ? 'bg-plc animate-pulse' : 'bg-line-strong',
            )}
            aria-hidden
          />
          {ROTULO_ESTADO[estado]}
          {ciclo && dosificando && (
            <>
              <span className="text-faint">·</span>
              <span className="tabular-nums">batch {ciclo.batch}</span>
            </>
          )}
        </span>
      </div>

      {!ciclo || !dosificando ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {ciclo
            ? `Terminó el batch ${ciclo.batch}. La carga ya está abajo, esperando cliente.`
            : 'Esperando que arranque un ciclo.'}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-heading text-xl font-semibold">{ciclo.receta}</span>
            <span className="font-mono text-lg tabular-nums">
              {ciclo.m3.toFixed(1).replace('.', ',')}
              <span className="text-faint ml-0.5 text-sm">m³</span>
            </span>
            <span className="text-faint ml-auto font-mono text-xs tabular-nums">
              {Math.round(ciclo.avance * 100)}%
            </span>
          </div>

          <ul className="mt-3 grid gap-2.5">
            {MATERIALES_PLC.map((m) => {
              const d = ciclo.dosificacion.find((x) => x.material === m);
              if (!d) return null;
              const p = d.objetivo ? Math.min((d.real / d.objetivo) * 100, 110) : 0;
              const listo = d.real >= d.objetivo * 0.995;
              const desvio = desvioDosificacion(d);

              return (
                <li key={m}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={cn(listo ? 'text-ink' : 'text-muted-foreground')}>{m}</span>
                    <span className="font-mono text-xs tabular-nums">
                      <span className={listo ? 'text-ink' : 'text-faint'}>
                        {num(Math.round(d.real))}
                      </span>
                      <span className="text-faint"> / {num(d.objetivo)} {d.unidad}</span>
                      {listo && Math.abs(desvio) >= 0.5 && (
                        <span className={desvio > 0 ? 'text-warn-text ml-1.5' : 'text-faint ml-1.5'}>
                          {desvio > 0 ? '+' : ''}
                          {desvio.toFixed(1).replace('.', ',')}%
                        </span>
                      )}
                    </span>
                  </div>

                  {/* La barra pasa del 100% cuando la balanza se pasa: si
                      se cortara en el objetivo, el desvío sería invisible
                      justo donde importa verlo. */}
                  <div className="bg-panel border-line/60 relative mt-1 h-2 overflow-hidden rounded-full border">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-200 ease-linear',
                        desvio > 1 && listo ? 'bg-warn' : 'bg-plc',
                      )}
                      style={{ width: `${Math.min(p, 100)}%` }}
                    />
                    <div
                      className="bg-line-strong absolute inset-y-0 w-px"
                      style={{ left: '90.9%' }}
                      aria-hidden
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
