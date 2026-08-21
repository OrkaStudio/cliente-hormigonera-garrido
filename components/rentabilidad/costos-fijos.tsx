'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  agregarCostoFijo,
  leerCostosFijos,
  quitarCostoFijo,
} from '@/lib/datos/costos-fijos-locales';
import { margenDespuesDeFijos, type CostoFijo } from '@/lib/dominio/rentabilidad';
import { $, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Los costos que no dependen de cuánto se produzca.
 *
 * Arranca vacío y lo dice: la spec pide que los fijos se decidan con
 * José, no por default. Mientras no cargue nada, la pantalla muestra
 * margen de materiales y punto — no un resultado inventado con sueldos
 * que nadie sabe cuánto son.
 */
export function CostosFijos({
  margenMateriales,
  proporcionDelMes,
}: {
  margenMateriales: number;
  proporcionDelMes: number;
}) {
  const [fijos, setFijos] = useState<CostoFijo[]>([]);
  const [montado, setMontado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    setFijos(leerCostosFijos());
    setMontado(true);
  }, []);

  if (!montado) return null;

  const resultado = margenDespuesDeFijos(margenMateriales, fijos, proporcionDelMes);
  const valido = nombre.trim().length > 1 && Number(monto) > 0;

  function agregar() {
    if (!valido) return;
    setFijos(agregarCostoFijo(nombre, Number(monto)));
    setNombre('');
    setMonto('');
  }

  return (
    <section className="border-line bg-panel shadow-tarjeta rounded-xl border p-4">
      <h2 className="rotulo-obra text-muted-foreground font-mono text-xs tracking-widest uppercase">
        Costos fijos
      </h2>

      {fijos.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Sueldos, alquiler, la cuota del mixer. Sin esto, arriba se ve margen de
          materiales y nada más.
        </p>
      ) : (
        <>
          <ul className="divide-line mt-2 divide-y">
            {fijos.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm">{f.nombre}</span>
                <span className="font-mono text-sm tabular-nums">{$(f.mensual)}</span>
                <span className="text-faint text-xs">/mes</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setFijos(quitarCostoFijo(f.id))}
                  aria-label={`Quitar ${f.nombre}`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>

          {resultado && (
            <div className="border-line mt-3 border-t pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  Después de fijos
                  {proporcionDelMes < 1 && (
                    <span className="text-faint">
                      {' '}
                      · {Math.round(proporcionDelMes * 100)}% del mes
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'font-mono text-xl font-semibold tabular-nums',
                    resultado.resultado >= 0 ? 'text-ok-text' : 'text-danger-text',
                  )}
                >
                  {$(resultado.resultado)}
                </span>
              </div>
              <p className="text-faint mt-1 text-xs">
                {$(margenMateriales)} de margen de materiales menos {$(resultado.fijos)} de
                fijos prorrateados.
              </p>
            </div>
          )}
        </>
      )}

      <div className="border-line mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="min-w-[9rem] flex-1">
          <Label htmlFor="cf-nombre" className="text-faint text-xs">
            Concepto
          </Label>
          <Input
            id="cf-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Sueldos"
            className="mt-1"
          />
        </div>
        <div className="w-32">
          <Label htmlFor="cf-monto" className="text-faint text-xs">
            Por mes
          </Label>
          <Input
            id="cf-monto"
            value={monto ? num(Number(monto)) : ''}
            onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            placeholder="0"
            className="mt-1 text-right font-mono tabular-nums"
          />
        </div>
        <Button variant="outline" onClick={agregar} disabled={!valido}>
          <Plus data-icon="inline-start" />
          Agregar
        </Button>
      </div>
    </section>
  );
}
