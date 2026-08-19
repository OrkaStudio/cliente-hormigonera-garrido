import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/ui/button';
import { Estado } from './estado';
import { TarjetaKpi } from './tarjeta-kpi';

const meta = {
  title: 'Dominio/Tarjeta de KPI',
  component: TarjetaKpi,
  parameters: {
    docs: {
      description: {
        component:
          'El número grande del tablero. Es la pieza más repetida de la aplicación: aparece ' +
          'en Inicio, en Rentabilidad y arriba de casi cada listado.\n\n' +
          'El tono se usa **solo cuando el número significa algo**. Un margen sano puede ir en ' +
          'verde; la producción del día no, porque 12 m³ no son ni buenos ni malos por sí solos.',
      },
    },
  },
  args: { rotulo: 'Producción', valor: '48,5', unidad: 'm³', pie: 'hormigón elaborado' },
} satisfies Meta<typeof TarjetaKpi>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutra: Story = {};

export const Fila: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <TarjetaKpi rotulo="Cargas del día" valor="7" pie="camiones despachados" />
      <TarjetaKpi rotulo="Producción" valor="48,5" unidad="m³" pie="hormigón elaborado" />
      <TarjetaKpi rotulo="Facturado" valor="$ 4.312.000" pie="a precio de lista" />
      <TarjetaKpi
        rotulo="Margen del día"
        valor="$ 1.207.360"
        pie="28,0% sobre la venta"
        tono="ok"
      />
    </div>
  ),
};

export const ConPie: Story = {
  name: 'Con chips y acción',
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <TarjetaKpi
        rotulo="Cargas del día"
        valor="7"
        pie="+2 respecto de ayer"
        extra={
          <>
            <Estado tono="ok" punto>
              Planta en línea
            </Estado>
            <Estado tono="neutro">Última 14:20</Estado>
          </>
        }
      />
      <TarjetaKpi
        rotulo="Sin asignar"
        valor="3"
        pie="cargas que todavía no son ventas"
        tono="warn"
        extra={
          <Button size="sm" variant="outline">
            Asignar clientes
          </Button>
        }
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'El pie separa el dato de lo que se puede hacer con él. Un KPI que dice "3 sin ' +
          'asignar" y no ofrece el camino para asignarlas obliga a buscar la pantalla a mano.',
      },
    },
  },
};

export const ConAlarma: Story = {
  name: 'Con alarma',
  args: {
    rotulo: 'Cemento regalado',
    valor: '14.003',
    unidad: 'kg',
    pie: '$ 2.520.540 en 6 semanas',
    tono: 'danger',
  },
};
