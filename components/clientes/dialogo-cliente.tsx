'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Cliente } from '@/lib/datos/tipos';

export type DatosCliente = Omit<Cliente, 'id'>;

const EN_BLANCO: DatosCliente = {
  nombre: '',
  contacto: null,
  telefono: null,
  mail: null,
  direccion: null,
  cuit: null,
  notas: null,
  activo: true,
  generico: false,
};

export interface DialogoClienteProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Presente = edición. Ausente = alta. */
  cliente?: Cliente | null;
  onGuardar: (datos: DatosCliente) => void;
  /** Para avisar que el nombre ya existe sin llegar a rechazarlo. */
  nombresExistentes?: string[];
}

/**
 * El alta y la edición de un cliente.
 *
 * Lo único obligatorio es el nombre. El criterio de terminado del
 * apartado 4 dice "dar de alta un cliente en menos de un minuto", y un
 * formulario que exige CUIT y dirección para guardar no cumple eso: el
 * administrativo tiene al camión esperando.
 *
 * Acá NO hay precio, ni descuento, ni flete bonificado. El precio vive
 * en la venta y se congela ahí — con la inflación de acá, un histórico
 * que se recalcula con el precio de hoy hace mentir a la rentabilidad
 * entera. Decisión de Fran del 20/08.
 */
export function DialogoCliente({
  abierto,
  onCerrar,
  cliente,
  onGuardar,
  nombresExistentes = [],
}: DialogoClienteProps) {
  const [datos, setDatos] = useState<DatosCliente>(EN_BLANCO);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setTocado(false);
    setDatos(cliente ? { ...cliente } : EN_BLANCO);
  }, [abierto, cliente]);

  const nombre = datos.nombre.trim();
  const faltaNombre = tocado && !nombre;

  // Avisar, no bloquear: puede haber dos "Riquelme" de verdad, y el que
  // está cargando sabe mejor que nosotros si son el mismo.
  const nombreRepetido =
    nombre.length > 0 &&
    nombresExistentes.some(
      (n) => n.toLowerCase() === nombre.toLowerCase() && n !== cliente?.nombre,
    );

  const campo = (k: keyof DatosCliente) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value || null }));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setTocado(true);
    if (!nombre) return;
    onGuardar({ ...datos, nombre });
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={guardar} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{cliente ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>
              Sólo el nombre es obligatorio. El resto se puede completar después,
              cuando haga falta para un documento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nombre">Nombre o razón social</Label>
              <Input
                id="nombre"
                value={datos.nombre}
                onChange={campo('nombre')}
                aria-invalid={faltaNombre || undefined}
                placeholder="Constructora del Este SRL"
                autoFocus
              />
              {faltaNombre && (
                <p className="text-destructive text-xs">
                  Sin nombre no se puede identificar al cliente en una carga.
                </p>
              )}
              {nombreRepetido && (
                <p className="text-warn-text text-xs">
                  Ya hay un cliente con este nombre. Si son distintos, agregale algo
                  que los separe.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={datos.contacto ?? ''}
                  onChange={campo('contacto')}
                  placeholder="Con quién se habla"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={datos.telefono ?? ''}
                  onChange={campo('telefono')}
                  inputMode="tel"
                  placeholder="2241 40-1180"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="mail">Mail</Label>
              <Input
                id="mail"
                type="email"
                value={datos.mail ?? ''}
                onChange={campo('mail')}
                placeholder="Para mandarle el remito"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={datos.direccion ?? ''}
                  onChange={campo('direccion')}
                  placeholder="Va en el encabezado del documento"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={datos.cuit ?? ''}
                  onChange={campo('cuit')}
                  inputMode="numeric"
                  placeholder="30-71044821-9"
                  className="sm:w-40"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notas">Notas</Label>
              <Input
                id="notas"
                value={datos.notas ?? ''}
                onChange={campo('notas')}
                placeholder="Lo que haya que recordar de este cliente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">{cliente ? 'Guardar cambios' : 'Dar de alta'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
