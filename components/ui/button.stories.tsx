import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus, Download, Trash2 } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Base/Botón',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'La botonera del sistema. Regla de uso: **una sola acción primaria por pantalla**. ' +
          'Si dos botones compiten en azul acero, el usuario no sabe cuál es el camino principal. ' +
          'Todo lo demás va en `outline` o `ghost`. El `destructive` se reserva para anular una ' +
          'carga o borrar un registro — acciones que no se deshacen solas.\n\n' +
          'Hay dos destructivos y no es redundancia: el **tenue** es el disparador que vive en ' +
          'una lista o una barra de acciones; el **sólido** es el botón que confirma adentro del ' +
          'diálogo. Un confirmar rosa pálido al lado de un "Volver" hace que la gente confirme ' +
          'sin leer.\n\n' +
          'El **enlace** va subrayado siempre: como el primario es negro, sin subrayado no se ' +
          'distingue del texto común.',
      },
    },
  },
  args: { children: 'Guardar' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primario: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Asignar cliente</Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="outline">Contorno</Button>
      <Button variant="ghost">Fantasma</Button>
      <Button variant="destructive">Anular carga</Button>
      <Button variant="destructive-solid">Anular</Button>
      <Button variant="link">Enlace</Button>
    </div>
  ),
};

export const Tamanos: Story = {
  name: 'Tamaños',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra chico</Button>
      <Button size="sm">Chico</Button>
      <Button size="default">Normal</Button>
      <Button size="lg">Grande</Button>
    </div>
  ),
};

export const ConIcono: Story = {
  name: 'Con ícono',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus /> Nueva compra
      </Button>
      <Button variant="outline">
        <Download /> Descargar remito
      </Button>
      <Button variant="destructive" size="icon" aria-label="Eliminar">
        <Trash2 />
      </Button>
    </div>
  ),
};

/**
 * Toda la superficie del componente en una sola grilla. Sirve para dos cosas:
 * ver que ninguna combinación quedó rota, y decidir de un vistazo cuál usar.
 */
export const Matriz: Story = {
  parameters: { layout: 'padded' },
  render: () => {
    const variantes = [
      'default',
      'secondary',
      'outline',
      'ghost',
      'destructive',
      'destructive-solid',
      'link',
    ] as const;
    const tamanos = ['xs', 'sm', 'default', 'lg'] as const;
    return (
      <table className="border-separate border-spacing-x-4 border-spacing-y-2">
        <thead>
          <tr>
            <th />
            {tamanos.map((t) => (
              <th
                key={t}
                className="text-hormigon-500 text-left text-[11px] font-semibold tracking-[0.08em] uppercase"
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variantes.map((v) => (
            <tr key={v}>
              <td className="text-hormigon-500 pr-2 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
                {v}
              </td>
              {tamanos.map((t) => (
                <td key={t}>
                  <Button variant={v} size={t}>
                    Guardar
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
};

export const Deshabilitado: Story = {
  args: { disabled: true, children: 'Sin permisos' },
};
