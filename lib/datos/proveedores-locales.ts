'use client';

import type { Proveedor } from '@/lib/datos/tipos';

/**
 * ⚠️ ANDAMIO DEL MVP — vive en el navegador, como sus hermanos.
 *
 * Los proveedores se dan de alta desde la compra, no en una pantalla
 * aparte: el momento en que aparece uno nuevo es cuando llega un camión
 * de alguien a quien no se le había comprado. El flujo del apartado 6 lo
 * dice así — "¿existe el proveedor? no → alta rápida: nombre y teléfono".
 */

const CLAVE = 'garrido:proveedores-mvp';

export function leerProveedores(): Proveedor[] {
  if (typeof window === 'undefined') return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Proveedor[]) : [];
  } catch {
    return [];
  }
}

export function altaProveedor(nombre: string, telefono: string, provee: string[]): Proveedor[] {
  const nuevo: Proveedor = {
    id: `PR-${Date.now().toString(36).toUpperCase()}`,
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    provee,
    activo: true,
  };
  const todos = [...leerProveedores(), nuevo];
  window.localStorage.setItem(CLAVE, JSON.stringify(todos));
  return todos;
}
