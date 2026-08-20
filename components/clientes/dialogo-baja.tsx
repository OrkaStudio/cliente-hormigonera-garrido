'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ClienteConResumen } from '@/lib/dominio/clientes';

export interface DialogoBajaProps {
  cliente: ClienteConResumen | null;
  onCerrar: () => void;
  onConfirmar: (cliente: ClienteConResumen) => void;
}

/**
 * R1 — un cliente con ventas no se borra nunca. Se desactiva.
 *
 * El diálogo existe para decir eso, no para pedir permiso: el miedo de
 * quien aprieta "desactivar" es perder el historial, y si no se lo
 * respondemos acá no lo aprieta nunca. Por eso el texto dice cuántas
 * ventas quedan guardadas en vez de preguntar "¿estás seguro?".
 */
export function DialogoBaja({ cliente, onCerrar, onConfirmar }: DialogoBajaProps) {
  if (!cliente) return null;

  const volviendo = !cliente.activo;
  const { ventas } = cliente.resumen;

  return (
    <Dialog open={Boolean(cliente)} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {volviendo ? `Reactivar a ${cliente.nombre}` : `Desactivar a ${cliente.nombre}`}
          </DialogTitle>
          <DialogDescription>
            {volviendo ? (
              <>Vuelve a aparecer en la lista al asignar una carga.</>
            ) : (
              <>
                Deja de aparecer al asignar una carga.{' '}
                {ventas > 0 ? (
                  <>
                    Sus {ventas} {ventas === 1 ? 'venta' : 'ventas'} no se tocan: quedan
                    en el historial y siguen contando en los totales de la planta.
                  </>
                ) : (
                  <>Todavía no tiene ventas, así que no hay historial que preservar.</>
                )}{' '}
                Se puede reactivar cuando vuelva a comprar.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={volviendo ? 'default' : 'destructive-solid'}
            onClick={() => onConfirmar(cliente)}
          >
            {volviendo ? 'Reactivar' : 'Desactivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
