import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BarraDesvio } from '@/components/dominio/barra-desvio';
import { Estado, MarcaFiscal } from '@/components/dominio/estado';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const meta = {
  title: 'Base/Tabla',
  component: Table,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'La tabla densa. Es donde vive la mayor parte de la aplicación: cargas, ventas, ' +
          'compras, movimientos de stock.\n\n' +
          'Tres reglas que no se negocian:\n\n' +
          '1. **Los números van a la derecha y con `.num`.** Alineados a la izquierda no se ' +
          'pueden comparar de un vistazo.\n' +
          '2. **Fila de totales al pie.** José mira el total antes que las filas.\n' +
          '3. **El estado va como etiqueta, no como color de fila.** Pintar la fila entera de ' +
          'rojo hace ilegible el texto y no se puede filtrar con la vista.',
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const cargas = [
  { hora: '07:42', remito: '0001-00012847', cliente: 'Constructora del Este SRL', m3: 7, objetivo: 2240, real: 2281, total: 623000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '09:15', remito: '0001-00012848', cliente: 'Obras Monte SA', m3: 6, objetivo: 1920, real: 1958, total: 534000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '10:03', remito: '—', cliente: 'Sin asignar', m3: 8, objetivo: 2560, real: 2611, total: 0, fiscal: 'negro' as const, estado: 'Sin cliente' },
  { hora: '11:48', remito: '0001-00012849', cliente: 'Constructora del Este SRL', m3: 7, objetivo: 2240, real: 2268, total: 623000, fiscal: 'blanco' as const, estado: 'Facturada' },
  { hora: '14:20', remito: '—', cliente: 'Obras Monte SA', m3: 6, objetivo: 1920, real: 1969, total: 534000, fiscal: 'negro' as const, estado: 'Asignada' },
];

const fmt = new Intl.NumberFormat('es-AR');
const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const CargasDelDia: Story = {
  name: 'Cargas del día',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hora</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">m³</TableHead>
          <TableHead className="text-right">Cemento obj.</TableHead>
          <TableHead className="text-right">Cemento real</TableHead>
          <TableHead className="w-32">Desvío</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Fiscal</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargas.map((c) => (
          <TableRow key={c.hora}>
            <TableCell className="num text-faint">{c.hora}</TableCell>
            <TableCell className="font-medium">{c.cliente}</TableCell>
            <TableCell className="num text-right">{c.m3}</TableCell>
            <TableCell className="num text-faint text-right">{fmt.format(c.objetivo)}</TableCell>
            <TableCell className="num text-right">{fmt.format(c.real)}</TableCell>
            <TableCell>
              <BarraDesvio objetivo={c.objetivo} real={c.real} />
            </TableCell>
            <TableCell className="num text-right">
              {c.total ? pesos.format(c.total) : '—'}
            </TableCell>
            <TableCell>
              <MarcaFiscal tipo={c.fiscal} />
            </TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total del día</TableCell>
          <TableCell className="num text-right">34</TableCell>
          <TableCell className="num text-right">{fmt.format(10880)}</TableCell>
          <TableCell className="num text-right">{fmt.format(11087)}</TableCell>
          <TableCell />
          <TableCell className="num text-right">{pesos.format(2314000)}</TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
