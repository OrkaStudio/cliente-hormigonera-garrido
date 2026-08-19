import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alerta } from '@/components/dominio/alerta';
import { BarraDesvio } from '@/components/dominio/barra-desvio';
import { EncabezadoPagina } from '@/components/dominio/encabezado-pagina';
import { Estado, MarcaFiscal } from '@/components/dominio/estado';
import { Segmentado } from '@/components/dominio/segmentado';
import { SemaforoStock } from '@/components/dominio/semaforo-stock';
import { TarjetaKpi } from '@/components/dominio/tarjeta-kpi';
import { TresNumeros } from '@/components/dominio/tres-numeros';

const meta = {
  title: 'Showcase/Tablero de planta',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Una pantalla completa armada **solo con piezas del sistema**, sin una sola clase ' +
          'inventada para la ocasión.\n\n' +
          'Existe para juzgar el conjunto. Componente por componente todo puede verse bien y ' +
          'el tablero entero ser ilegible: demasiados colores compitiendo, jerarquía plana, ' +
          'números que no se alinean. Acá se ve.\n\n' +
          'También es la prueba de que el sistema alcanza: si para construir esto hizo falta ' +
          'salirse del catálogo, al catálogo le falta algo.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const cargas = [
  { hora: '07:42', cliente: 'Constructora del Este SRL', receta: 'H-21', m3: 7, objetivo: 2240, real: 2281, total: 623000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '09:15', cliente: 'Obras Monte SA', receta: 'H-25', m3: 6, objetivo: 1920, real: 1958, total: 534000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '10:03', cliente: 'Sin asignar', receta: 'H-21', m3: 8, objetivo: 2560, real: 2611, total: 0, fiscal: 'negro' as const, estado: 'Sin cliente' },
  { hora: '11:48', cliente: 'Constructora del Este SRL', receta: 'H-21', m3: 7, objetivo: 2240, real: 2268, total: 623000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '14:20', cliente: 'Obras Monte SA', receta: 'H-30', m3: 6, objetivo: 1920, real: 1969, total: 534000, fiscal: 'negro' as const, estado: 'Asignada' },
];

const fmt = new Intl.NumberFormat('es-AR');
const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function Tablero() {
  const [filtro, setFiltro] = useState('todas');
  const visibles = filtro === 'todas' ? cargas : cargas.filter((c) => c.cliente === 'Sin asignar');

  return (
    <div className="bg-background min-h-screen">
      {/* La barra superior es el único lugar donde el rojo de marca aparece
          sin significar alarma: acá no hay datos con los que confundirse. */}
      <header className="border-line bg-card border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-marca text-lg font-black tracking-tight">HORMIMONTE</span>
            <span className="text-faint text-xs">Planta Monte · Ruta 3 y 41</span>
          </div>
          <nav className="text-faint hidden gap-5 text-sm md:flex">
            <span className="text-ink border-ink border-b-2 pb-0.5 font-medium">
              Inicio
            </span>
            <span>Cargas</span>
            <span>Ventas</span>
            <span>Stock</span>
            <span>Rentabilidad</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <EncabezadoPagina
          titulo="Resumen del día"
          bajada="miércoles 19 de agosto · última carga a las 14:20"
          acciones={
            <>
              <Button variant="outline">
                <Download /> Exportar
              </Button>
              <Button>
                <Plus /> Carga manual
              </Button>
            </>
          }
        />

        <Alerta
          tono="danger"
          titulo="La balanza de cemento carga 1,9% de más"
          accion={
            <Button size="sm" variant="outline">
              Ver desvíos
            </Button>
          }
        >
          Son 14.003 kg en las últimas 6 semanas — {pesos.format(2520540)} que se fueron sin
          facturar.
        </Alerta>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaKpi
            rotulo="Cargas del día"
            valor="7"
            pie="+2 respecto de ayer"
            extra={
              <Estado tono="ok" punto>
                Planta en línea
              </Estado>
            }
          />
          <TarjetaKpi rotulo="Producción" valor="48,5" unidad="m³" pie="hormigón elaborado" />
          <TarjetaKpi rotulo="Facturado" valor={pesos.format(2314000)} pie="a precio de lista" />
          <TarjetaKpi
            rotulo="Margen del día"
            valor={pesos.format(647920)}
            pie="28,0% sobre la venta"
            tono="ok"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="border-line bg-card shadow-tarjeta self-start overflow-hidden rounded-lg border lg:col-span-2">
            <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <h2 className="font-semibold">Cargas de hoy</h2>
              <Segmentado
                valor={filtro}
                onCambio={setFiltro}
                opciones={[
                  { valor: 'todas', etiqueta: 'Todas', cantidad: cargas.length },
                  { valor: 'sin-cliente', etiqueta: 'Sin cliente', cantidad: 1 },
                ]}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">m³</TableHead>
                  <TableHead className="text-right">Cemento</TableHead>
                  <TableHead className="w-28">Desvío</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((c) => (
                  <TableRow key={c.hora}>
                    <TableCell className="num text-faint">{c.hora}</TableCell>
                    <TableCell>
                      <span className="font-medium">{c.cliente}</span>
                      <span className="text-faint ml-2 text-xs">{c.receta}</span>
                    </TableCell>
                    <TableCell className="num text-right">{c.m3}</TableCell>
                    <TableCell className="num text-right">{fmt.format(c.real)}</TableCell>
                    <TableCell>
                      <BarraDesvio objetivo={c.objetivo} real={c.real} />
                    </TableCell>
                    <TableCell className="num text-right">
                      {c.total ? pesos.format(c.total) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MarcaFiscal tipo={c.fiscal} />
                        <Estado
                          tono={
                            c.estado === 'Sin cliente'
                              ? 'warn'
                              : c.estado === 'Facturada'
                                ? 'plc'
                                : 'ok'
                          }
                          punto
                        >
                          {c.estado}
                        </Estado>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {filtro === 'todas' ? (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total del día</TableCell>
                    <TableCell className="num text-right">34</TableCell>
                    <TableCell className="num text-right">{fmt.format(11087)}</TableCell>
                    <TableCell />
                    <TableCell className="num text-right">{pesos.format(2314000)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </section>

          <aside className="flex flex-col gap-4">
            <SemaforoStock material="Cemento" restante={32000} capacidad={50000} diasRestantes={6} />
            <SemaforoStock material="Arena" restante={18000} capacidad={80000} diasRestantes={2} />
            <TresNumeros material="Cemento · carga 14:20" receta={320} objetivo={320} real={328} />
          </aside>
        </div>
      </main>
    </div>
  );
}

export const Inicio: Story = {
  render: () => <Tablero />,
};
