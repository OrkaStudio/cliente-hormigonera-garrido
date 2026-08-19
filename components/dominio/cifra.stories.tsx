import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Cifra } from './cifra';

const meta = {
  title: 'Dominio/Cifra',
  component: Cifra,
  parameters: {
    docs: {
      description: {
        component:
          'Toda cifra de la aplicación pasa por acá. El punto no es el estilo: es que los ' +
          'numerales sean **tabulares**. Sin ancho fijo por dígito, una columna de kg o de ' +
          'pesos baila y deja de leerse de un vistazo — que es lo único que José hace con ' +
          'esta aplicación.',
      },
    },
  },
  args: { valor: '48,5', unidad: 'm³' },
} satisfies Meta<typeof Cifra>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Base: Story = {};

export const Tamanos: Story = {
  name: 'Tamaños',
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Cifra valor="1.240" unidad="kg" tamano="sm" />
      <Cifra valor="1.240" unidad="kg" tamano="md" />
      <Cifra valor="1.240" unidad="kg" tamano="lg" />
      <Cifra valor="1.240" unidad="kg" tamano="xl" />
    </div>
  ),
};

export const Tonos: Story = {
  render: () => (
    <div className="flex flex-wrap items-baseline gap-6">
      <Cifra valor="+2 kg" tono="ok" tamano="lg" />
      <Cifra valor="+9 kg" tono="atencion" tamano="lg" />
      <Cifra valor="+34 kg" tono="alarma" tamano="lg" />
      <Cifra valor="320 kg" tono="acero" tamano="lg" />
    </div>
  ),
};

export const PorQueTabulares: Story = {
  name: 'Por qué tabulares',
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <p className="text-hormigon-500 mb-2 text-xs font-semibold uppercase">Con .num</p>
        <div className="num flex flex-col items-end text-lg">
          <span>111.111</span>
          <span>999.999</span>
          <span>184.320</span>
        </div>
      </div>
      <div>
        <p className="text-hormigon-500 mb-2 text-xs font-semibold uppercase">Sin .num</p>
        <div className="flex flex-col items-end text-lg">
          <span>111.111</span>
          <span>999.999</span>
          <span>184.320</span>
        </div>
      </div>
    </div>
  ),
};
