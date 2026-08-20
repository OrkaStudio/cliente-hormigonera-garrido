import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SemaforoStock } from './semaforo-stock';

const meta = {
  title: 'Dominio/Semáforo de stock',
  component: SemaforoStock,
  parameters: {
    docs: {
      description: {
        component:
          'Cuánto queda en el silo y cuándo se quiebra.\n\n' +
          '**Los silos de la planta no tienen balanza.** Este número es deducido: entradas por ' +
          'compra menos consumo por carga. Se desvía de la realidad y hay que recalibrarlo a ojo ' +
          'cada tanto — por eso la etiqueta "estimado" es parte del componente y no se saca.\n\n' +
          'Efecto lateral aprovechable: la diferencia entre lo deducido y la recalibración a ojo ' +
          '**mide la merma**, un dato que hoy no tiene nadie en la planta.',
      },
    },
  },
  args: { material: 'Cemento', restante: 32000, capacidad: 50000, diasRestantes: 6 },
} satisfies Meta<typeof SemaforoStock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};

export const Bajo: Story = {
  args: { restante: 11000, diasRestantes: 2 },
};

export const Quiebre: Story = {
  args: { restante: 3500, diasRestantes: 0 },
};

export const Silos: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      <SemaforoStock material="Cemento" restante={32000} capacidad={50000} diasRestantes={6} />
      <SemaforoStock material="Arena" restante={18000} capacidad={80000} diasRestantes={2} />
      <SemaforoStock material="Piedra 6-20" restante={4200} capacidad={80000} diasRestantes={0} />
    </div>
  ),
};
