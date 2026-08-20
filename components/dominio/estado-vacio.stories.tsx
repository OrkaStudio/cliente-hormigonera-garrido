import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/ui/button';
import { EstadoVacio } from './estado-vacio';

const meta = {
  title: 'Dominio/Estado vacío',
  component: EstadoVacio,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'La pantalla sin datos.\n\n' +
          'En esta aplicación el vacío suele ser información real: "hoy la planta todavía no ' +
          'produjo" no es un error, es el estado de las 7 de la mañana. Por eso el texto ' +
          'explica la causa en vez de disculparse, y nunca dice "no hay datos" a secas.',
      },
    },
  },
  args: {
    titulo: 'Todavía no hay cargas hoy',
    descripcion: 'Cuando la planta termine el primer pastón, aparece acá solo.',
  },
} satisfies Meta<typeof EstadoVacio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinAccion: Story = {};

export const ConAccion: Story = {
  args: {
    titulo: 'No hay proveedores cargados',
    descripcion: 'Para registrar una compra de material primero necesitás al menos uno.',
    accion: <Button>Agregar proveedor</Button>,
  },
};
