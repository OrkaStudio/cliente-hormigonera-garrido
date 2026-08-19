import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Estado, MarcaFiscal } from './estado';

const meta = {
  title: 'Dominio/Estado',
  component: Estado,
  parameters: {
    docs: {
      description: {
        component:
          'La etiqueta de estado. Un solo componente para los estados de carga, de stock y ' +
          'de documento, para que el mismo concepto no se vea de tres formas distintas ' +
          'según la pantalla.',
      },
    },
  },
  args: { children: 'Asignada', tono: 'ok' },
} satisfies Meta<typeof Estado>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {};

export const EstadosDeUnaCarga: Story = {
  name: 'Estados de una carga',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Estado tono="warn" punto>
        Sin cliente
      </Estado>
      <Estado tono="ok" punto>
        Asignada
      </Estado>
      <Estado tono="plc" punto>
        Facturada
      </Estado>
      <Estado tono="danger" punto>
        Anulada
      </Estado>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Una carga anulada **igual descuenta stock**: el material se usó aunque la venta ' +
          'se caiga. Por eso "anulada" es alarma y no un estado neutro.',
      },
    },
  },
};

export const EstadosDeStock: Story = {
  name: 'Estados de stock',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Estado tono="ok" punto>
        Normal
      </Estado>
      <Estado tono="warn" punto>
        Bajo
      </Estado>
      <Estado tono="danger" punto>
        Quiebre
      </Estado>
    </div>
  ),
};

export const Fiscal: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <MarcaFiscal tipo="blanco" />
      <MarcaFiscal tipo="negro" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Deliberadamente **sin color de estado**: que una venta sea en negro no es un error ' +
          'ni una alarma. La plataforma marca de qué lado cae cada venta y las muestra ' +
          'separadas; nada fiscal se calcula acá.',
      },
    },
  },
};
