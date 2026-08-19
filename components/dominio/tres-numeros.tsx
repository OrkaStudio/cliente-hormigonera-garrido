import { cn } from '@/lib/utils';
import { num, signo } from '@/lib/formato';
import { Cifra } from './cifra';
import { tonoDeDesvio, textoPorTono } from './tono';

export interface TresNumerosProps {
  material: string;
  /** Lo que dice la receta cargada en la plataforma. */
  receta: number;
  /** Lo que pidió el PLC en este pastón. */
  objetivo: number;
  /** Lo que pesó la balanza. */
  real: number;
  unidad?: string;
  className?: string;
}

/**
 * Los tres números. El componente central de todo el sistema.
 *
 * La distinción no es cosmética, es de diagnóstico:
 *
 *   objetivo ≠ real   → la balanza está descalibrada
 *   objetivo ≠ receta → la receta está mal cargada en el PLC,
 *                       y eso NO se arregla calibrando
 *
 * Mostrar solo "pedido vs real" borra la segunda causa y manda al
 * operario a calibrar una balanza que está bien. Por eso van los tres.
 */
export function TresNumeros({
  material,
  receta,
  objetivo,
  real,
  unidad = 'kg',
  className,
}: TresNumerosProps) {
  const tono = tonoDeDesvio(objetivo, real);
  const desvio = real - objetivo;
  const recetaMalCargada = receta !== objetivo;

  return (
    <div className={cn('border-hormigon-300 bg-card shadow-tarjeta rounded-lg border p-4', className)}>
      <div className="flex items-baseline justify-between">
        <p className="font-medium text-hormigon-900">{material}</p>
        <span className={cn('num text-sm font-semibold', textoPorTono[tono])}>
          {signo(desvio, unidad)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-hormigon-500 text-[11px] font-medium tracking-wide uppercase">
            Receta
          </dt>
          <dd className="mt-0.5">
            <Cifra valor={num(receta)} unidad={unidad} tamano="sm" atenuado />
          </dd>
        </div>
        <div>
          <dt className="text-hormigon-500 text-[11px] font-medium tracking-wide uppercase">
            Objetivo PLC
          </dt>
          <dd className="mt-0.5">
            <Cifra valor={num(objetivo)} unidad={unidad} tono="acero" tamano="sm" />
          </dd>
        </div>
        <div>
          <dt className="text-hormigon-500 text-[11px] font-medium tracking-wide uppercase">
            Real
          </dt>
          <dd className="mt-0.5">
            <Cifra valor={num(real)} unidad={unidad} tamano="sm" />
          </dd>
        </div>
      </dl>

      {recetaMalCargada ? (
        <p className="text-atencion-700 bg-atencion-50 border-atencion-200 mt-3 rounded border px-2 py-1.5 text-xs">
          El PLC está pidiendo {signo(objetivo - receta, unidad)} respecto de la receta.
          Esto no se corrige calibrando la balanza: hay que revisar la receta cargada en el PLC.
        </p>
      ) : null}
    </div>
  );
}
