import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta = {
  title: 'Base/Diálogo',
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          'El diálogo de carga y de confirmación. Viene de **Base UI**, la primitiva sobre la ' +
          'que shadcn construye hoy: el foco, el `Esc` y el atrapado de tabulación ya funcionan. ' +
          'Eso es exactamente lo que no queremos reimplementar a mano.\n\n' +
          'Ojo con la API: Base UI usa `render={<Button />}`, no el `asChild` de Radix.\n\n' +
          'Para acciones irreversibles (anular una carga) el botón de confirmación va en ' +
          '`destructive` y el texto dice **qué consecuencia tiene**, no "¿estás seguro?".',
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Carga: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Asignar cliente</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar cliente a la carga</DialogTitle>
          <DialogDescription>
            Carga de las 10:03 · 8 m³ · H-21. Hasta que tenga cliente no es una venta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="d-cliente">Cliente</Label>
          <Input id="d-cliente" placeholder="Buscar por razón social" />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Destructivo: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>Anular carga</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular la carga de las 10:03</DialogTitle>
          <DialogDescription>
            La venta deja de contar para rentabilidad, pero el material{' '}
            <strong>igual se descuenta del stock</strong>: el pastón se produjo y el cemento
            se usó.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Volver</DialogClose>
          <Button variant="destructive-solid">Anular</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
