'use client';

import { useState } from 'react';
import { Ruler } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registrarAjuste } from '@/lib/datos/ajustes-locales';
import type { AjusteStock } from '@/lib/dominio/stock';
import { fechaDeMomento, num } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * Declarar lo que hay de verdad en el silo.
 *
 * Es lo único manual del apartado (R1) y no pisa nada: queda un ajuste
 * con fecha, y la diferencia contra lo que la cuenta decía se acumula
 * como merma medida (R3, R4). Con un ajuste no dice nada; con varios, es
 * el primer número real de pérdida que va a tener la planta.
 */
export function AjustarStock({
  material,
  calculado,
  unidad,
  ultimo,
  onAjuste,
}: {
  material: string;
  calculado: number;
  unidad: string;
  ultimo: AjusteStock | null;
  onAjuste: (ajustes: AjusteStock[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [declarado, setDeclarado] = useState('');
  const [motivo, setMotivo] = useState('');

  const valor = Number(declarado);
  const valido = declarado !== '' && valor >= 0;
  const diferencia = valido ? valor - calculado : 0;

  function guardar() {
    if (!valido) return;
    onAjuste(registrarAjuste(material, valor, calculado, motivo));
    setDeclarado('');
    setMotivo('');
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <span className="flex items-center gap-3">
        {ultimo && (
          <span className="text-faint">
            último ajuste {fechaDeMomento(ultimo.fecha)}
          </span>
        )}
        <Button variant="outline" size="xs" onClick={() => setAbierto(true)}>
          <Ruler data-icon="inline-start" />
          Miré el silo
        </Button>
      </span>
    );
  }

  return (
    <div className="border-line bg-panel mt-2 w-full rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">
        La cuenta dice{' '}
        <span className="text-ink font-mono">
          {num(calculado)} {unidad}
        </span>
        . ¿Cuánto hay?
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Label htmlFor={`aj-${material}`} className="text-faint text-xs">
            Lo que hay
          </Label>
          <Input
            id={`aj-${material}`}
            value={declarado ? num(Number(declarado)) : ''}
            onChange={(e) => setDeclarado(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            placeholder="0"
            className="mt-1 text-right font-mono tabular-nums"
          />
        </div>

        <div className="min-w-[8rem] flex-1">
          <Label htmlFor={`mo-${material}`} className="text-faint text-xs">
            Motivo (opcional)
          </Label>
          <Input
            id={`mo-${material}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Medición con sonda"
            className="mt-1"
          />
        </div>

        <Button size="sm" onClick={guardar} disabled={!valido}>
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>

      {valido && diferencia !== 0 && (
        <p
          className={cn(
            'mt-2 text-xs',
            diferencia < 0 ? 'text-warn-text' : 'text-muted-foreground',
          )}
        >
          {diferencia < 0 ? (
            <>
              Faltan{' '}
              <span className="font-mono">
                {num(Math.abs(diferencia))} {unidad}
              </span>{' '}
              contra lo que decía la cuenta. Eso es la merma, y queda medida.
            </>
          ) : (
            <>
              Hay{' '}
              <span className="font-mono">
                {num(diferencia)} {unidad}
              </span>{' '}
              más de lo que decía la cuenta.
            </>
          )}
        </p>
      )}
    </div>
  );
}
