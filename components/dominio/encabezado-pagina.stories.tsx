import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EncabezadoPagina } from './encabezado-pagina';

const meta = {
  title: 'Dominio/Encabezado de página',
  component: EncabezadoPagina,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'El encabezado de los nueve apartados. Existe uno solo para que los títulos no se ' +
          'desalineen entre pantallas.',
      },
    },
  },
  args: { titulo: 'Resumen del día' },
} satisfies Meta<typeof EncabezadoPagina>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {};

export const ConBajadaYAcciones: Story = {
  name: 'Con bajada y acciones',
  args: {
    titulo: 'Cargas',
    bajada: 'martes 19 de agosto · última carga a las 14:20',
    acciones: (
      <>
        <Button variant="outline">
          <Download /> Exportar
        </Button>
        <Button>
          <Plus /> Carga manual
        </Button>
      </>
    ),
  },
};
