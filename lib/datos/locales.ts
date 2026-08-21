'use client';

import type { ClienteConResumen, ResumenCliente } from '@/lib/dominio/clientes';
import type { Cliente } from './tipos';

/**
 * ⚠️ ANDAMIO DEL MVP — ESTO NO ES UNA BASE DE DATOS.
 *
 * Clientes es el primer apartado que escribe, y todavía no hay proyecto
 * de Supabase. Sin ningún lugar donde guardar, el alta sería un formulario
 * que se olvida al recargar: se ve funcionar y no funciona.
 *
 * Entonces lo que se carga queda en el navegador de quien lo cargó. Eso
 * alcanza para mostrar el apartado y para que José lo toque en una
 * reunión, pero hay que tener presente lo que NO es:
 *
 *   - No se comparte. Si Fran carga un cliente, Lau no lo ve.
 *   - No sobrevive a otro navegador, ni a una ventana de incógnito.
 *   - No hay validación de unicidad real ni concurrencia.
 *
 * El día que entre Supabase, este archivo se borra entero y las
 * pantallas pasan a llamar server actions. Por eso el resto del código
 * no sabe que existe: sólo lo tocan los componentes de Clientes.
 */

const CLAVE = 'garrido:clientes-mvp';

interface EstadoLocal {
  /** Los que se dieron de alta acá. */
  nuevos: Cliente[];
  /** Parches sobre los sembrados: editar y activar/desactivar. */
  cambios: Record<string, Partial<Cliente>>;
}

const VACIO: EstadoLocal = { nuevos: [], cambios: {} };

export function leerLocales(): EstadoLocal {
  if (typeof window === 'undefined') return VACIO;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return VACIO;
    const parseado = JSON.parse(crudo) as Partial<EstadoLocal>;
    return { nuevos: parseado.nuevos ?? [], cambios: parseado.cambios ?? {} };
  } catch {
    // Un localStorage corrupto no puede tumbar la pantalla entera.
    return VACIO;
  }
}

function escribir(estado: EstadoLocal) {
  window.localStorage.setItem(CLAVE, JSON.stringify(estado));
}

export function altaLocal(cliente: Omit<Cliente, 'id'>): Cliente {
  const estado = leerLocales();
  const nuevo: Cliente = { ...cliente, id: `CL-L${Date.now().toString(36)}` };
  escribir({ ...estado, nuevos: [...estado.nuevos, nuevo] });
  return nuevo;
}

export function editarLocal(id: string, parche: Partial<Cliente>) {
  const estado = leerLocales();

  // Un cliente creado acá se edita en su lugar; uno sembrado no se puede
  // tocar, así que el cambio va aparte y se aplica al leer.
  const esNuevo = estado.nuevos.some((c) => c.id === id);
  if (esNuevo) {
    escribir({
      ...estado,
      nuevos: estado.nuevos.map((c) => (c.id === id ? { ...c, ...parche } : c)),
    });
    return;
  }

  escribir({
    ...estado,
    cambios: { ...estado.cambios, [id]: { ...estado.cambios[id], ...parche } },
  });
}

const RESUMEN_VACIO: ResumenCliente = {
  ventas: 0,
  m3: 0,
  facturado: 0,
  ultimaCompra: null,
  recetaFrecuente: null,
  blanco: 0,
  negro: 0,
  definidas: 0,
};

/**
 * Los sembrados con los cambios locales encima, más los dados de alta.
 *
 * Los nuevos van con resumen en cero, que es la verdad: todavía no
 * compraron nada. Cuando exista Cargas, van a empezar a sumar solos.
 */
export function aplicarLocales(sembrados: ClienteConResumen[]): ClienteConResumen[] {
  const { nuevos, cambios } = leerLocales();

  const conParches = sembrados.map((c) =>
    cambios[c.id] ? { ...c, ...cambios[c.id] } : c,
  );

  return [
    ...nuevos.map((c) => ({ ...c, resumen: { ...RESUMEN_VACIO } })),
    ...conParches,
  ];
}

/** Para el perfil de un cliente que sólo existe en este navegador. */
export function buscarLocal(id: string): ClienteConResumen | null {
  const encontrado = leerLocales().nuevos.find((c) => c.id === id);
  return encontrado ? { ...encontrado, resumen: { ...RESUMEN_VACIO } } : null;
}

export function parcheLocal(id: string): Partial<Cliente> {
  return leerLocales().cambios[id] ?? {};
}
