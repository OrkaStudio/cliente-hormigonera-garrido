import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Segmentado } from './segmentado';

const meta = {
  title: 'Dominio/Segmentado',
  component: Segmentado,
  parameters: {
    docs: {
      description: {
        component:
          'El filtro de dos o tres posiciones que vive en el encabezado de una tarjeta.\n\n' +
          'Lleva el contador adentro a propósito: "Sin cliente · 3" deja decidir si vale la ' +
          'pena entrar. Sin el número hay que abrir para enterarse de que no había nada.\n\n' +
          'Si las opciones son más de tres, esto no sirve — va un select.',
      },
    },
  },
  args: {
    valor: 'todas',
    opciones: [
      { valor: 'todas', etiqueta: 'Todas', cantidad: 7 },
      { valor: 'sin-cliente', etiqueta: 'Sin cliente', cantidad: 3 },
    ],
  },
} satisfies Meta<typeof Segmentado>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactivo(props: React.ComponentProps<typeof Segmentado>) {
  const [valor, setValor] = useState(props.valor);
  return <Segmentado {...props} valor={valor} onCambio={setValor} />;
}

export const DosPosiciones: Story = {
  name: 'Dos posiciones',
  render: (args) => <Interactivo {...args} />,
};

export const TresPosiciones: Story = {
  name: 'Tres posiciones',
  args: {
    valor: 'ambos',
    opciones: [
      { valor: 'ambos', etiqueta: 'Ambos' },
      { valor: 'blanco', etiqueta: 'Blanco', cantidad: 12 },
      { valor: 'negro', etiqueta: 'Negro', cantidad: 5 },
    ],
  },
  render: (args) => <Interactivo {...args} />,
};
