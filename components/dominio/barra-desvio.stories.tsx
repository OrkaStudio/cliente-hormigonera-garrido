import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BarraDesvio } from './barra-desvio';

const meta = {
  title: 'Dominio/Barra de desvío',
  component: BarraDesvio,
  parameters: {
    docs: {
      description: {
        component:
          'El desvío como barra, con el cero en el centro.\n\n' +
          'En una tabla de veinte pastones el número solo no muestra el patrón. La barra sí: ' +
          'si todas se van para el mismo lado, la balanza está corrida. Si se reparten a los ' +
          'dos lados, es ruido normal de pesaje.',
      },
    },
  },
  args: { objetivo: 320, real: 326 },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BarraDesvio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorEncima: Story = { name: 'Por encima del objetivo' };

export const PorDebajo: Story = {
  name: 'Por debajo del objetivo',
  args: { real: 308 },
};

export const RuidoNormal: Story = {
  name: 'Ruido normal (se reparte)',
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      {[322, 317, 321, 319, 323, 318].map((real, i) => (
        <BarraDesvio key={i} objetivo={320} real={real} />
      ))}
    </div>
  ),
};

export const BalanzaCorrida: Story = {
  name: 'Balanza corrida (todas al mismo lado)',
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      {[326, 331, 328, 334, 327, 330].map((real, i) => (
        <BarraDesvio key={i} objetivo={320} real={real} />
      ))}
    </div>
  ),
};
