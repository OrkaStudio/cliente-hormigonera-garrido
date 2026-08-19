import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/ui/button';
import { Alerta } from './alerta';

const meta = {
  title: 'Dominio/Alerta',
  component: Alerta,
  parameters: {
    docs: {
      description: {
        component:
          'El aviso que interrumpe.\n\n' +
          '**Regla de uso: una alerta sin acción posible es ruido.** Si el usuario no puede ' +
          'hacer nada al respecto, el dato va en la pantalla como dato, no como alerta. ' +
          'Una pantalla con cinco alertas permanentes es una pantalla sin alertas.',
      },
    },
  },
  args: { titulo: 'Quedan 2 días de arena', tono: 'atencion' },
} satisfies Meta<typeof Alerta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Atencion: Story = {
  args: {
    children: 'Al ritmo de los últimos días el silo se vacía el jueves.',
    accion: <Button size="sm" variant="outline">Registrar compra</Button>,
  },
};

export const Alarma: Story = {
  args: {
    tono: 'alarma',
    titulo: 'La balanza de cemento carga 1,9% de más',
    children:
      'Son 14.003 kg en las últimas 6 semanas — $ 2.520.540 que se fueron sin facturar.',
    accion: <Button size="sm" variant="outline">Ver desvíos</Button>,
  },
};

export const Informativa: Story = {
  args: {
    tono: 'acero',
    titulo: '3 cargas de hoy todavía no tienen cliente',
    children: 'Hasta que se les asigne uno no son ventas y no suman a rentabilidad.',
    accion: <Button size="sm">Asignar</Button>,
  },
};
