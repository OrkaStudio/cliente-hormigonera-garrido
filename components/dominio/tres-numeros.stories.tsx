import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TresNumeros } from './tres-numeros';

const meta = {
  title: 'Dominio/Los tres números',
  component: TresNumeros,
  parameters: {
    docs: {
      description: {
        component:
          'El componente central del sistema. Muestra **receta declarada**, **objetivo del PLC** ' +
          'y **peso real** juntos, porque cada par revela una falla distinta:\n\n' +
          '- `objetivo ≠ real` → la balanza está descalibrada.\n' +
          '- `objetivo ≠ receta` → la receta está mal cargada en el PLC, y eso **no se arregla calibrando**.\n\n' +
          'Mostrar solo "pedido vs real" borra la segunda causa y manda al operario a calibrar ' +
          'una balanza que está bien.',
      },
    },
  },
  args: { material: 'Cemento', receta: 320, objetivo: 320, real: 326, unidad: 'kg' },
} satisfies Meta<typeof TresNumeros>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DentroDeTolerancia: Story = {
  name: 'Dentro de tolerancia',
  args: { real: 322 },
};

export const BalanzaCorrida: Story = {
  name: 'Balanza corrida',
  args: { real: 334 },
  parameters: {
    docs: {
      description: {
        story:
          'El caso real de la planta: la balanza de cemento sobredosifica cerca del 2% en ' +
          'cada carga. Una sola pasa desapercibida; acumulada seis semanas fueron 14.003 kg.',
      },
    },
  },
};

export const RecetaMalCargada: Story = {
  name: 'Receta mal cargada en el PLC',
  args: { receta: 320, objetivo: 340, real: 341 },
  parameters: {
    docs: {
      description: {
        story:
          'La balanza está perfecta — pesó lo que le pidieron. El problema es que le pidieron ' +
          'mal. Sin los tres números esto se lee como "todo en orden".',
      },
    },
  },
};

export const Agua: Story = {
  args: { material: 'Agua', receta: 175, objetivo: 175, real: 168, unidad: 'l' },
};
