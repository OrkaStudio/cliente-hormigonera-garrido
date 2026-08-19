import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const meta = {
  title: 'Base/Formulario',
  parameters: {
    docs: {
      description: {
        component:
          'Campos de carga. En esta aplicación casi todo lo que se escribe es una cantidad ' +
          'con unidad — kg, m³, pesos —, así que la unidad va **dentro** del campo y a la ' +
          'derecha: el usuario no tiene que adivinar si el número que está tipeando son ' +
          'kilos o toneladas.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CampoDeTexto: Story = {
  name: 'Campo de texto',
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="cliente">Razón social</Label>
      <Input id="cliente" placeholder="Constructora del Este SRL" />
    </div>
  ),
};

export const CampoConUnidad: Story = {
  name: 'Campo con unidad',
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="cemento">Cemento por m³</Label>
      <div className="relative">
        <Input id="cemento" type="number" defaultValue={320} className="num pr-10" />
        <span className="text-hormigon-500 pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
          kg
        </span>
      </div>
      <p className="text-hormigon-500 text-xs">
        Es la receta declarada. El PLC puede estar pidiendo otra cosa.
      </p>
    </div>
  ),
};

export const Seleccion: Story = {
  name: 'Selección',
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="receta">Receta</Label>
      <Select>
        <SelectTrigger id="receta">
          <SelectValue placeholder="Elegir receta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="h21">H-21 · bombeable</SelectItem>
          <SelectItem value="h25">H-25 · estructural</SelectItem>
          <SelectItem value="h30">H-30 · alta resistencia</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const ConError: Story = {
  name: 'Con error',
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="precio">Precio por m³</Label>
      <Input id="precio" defaultValue="0" aria-invalid className="num" />
      <p className="text-alarma-700 text-xs">
        El precio no puede ser cero: la venta quedaría sin facturar.
      </p>
    </div>
  ),
};

export const FormularioCompleto: Story = {
  name: 'Formulario completo',
  render: () => (
    <form className="grid max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="f-cliente">Cliente</Label>
        <Select>
          <SelectTrigger id="f-cliente">
            <SelectValue placeholder="Elegir cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Constructora del Este SRL</SelectItem>
            <SelectItem value="2">Obras Monte SA</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f-m3">Metros cúbicos</Label>
        <div className="relative">
          <Input id="f-m3" type="number" defaultValue={7} className="num pr-10" />
          <span className="text-hormigon-500 pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
            m³
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button">
          Cancelar
        </Button>
        <Button type="submit">Asignar</Button>
      </div>
    </form>
  ),
};
