import type { Preview } from '@storybook/nextjs-vite';
// Los tokens del sistema. Sin esta línea Storybook muestra los componentes
// sin vestir y el catálogo miente respecto de la aplicación.
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // El fondo por defecto es el de la aplicación: hormigón, no blanco.
    // Un componente que se ve bien sobre blanco puede desaparecer sobre gris.
    backgrounds: {
      options: {
        hormigon: { name: 'Hormigón (fondo de la app)', value: '#f4f3f1' },
        papel: { name: 'Papel (dentro de una tarjeta)', value: '#ffffff' },
        carbon: { name: 'Carbón', value: '#1c1917' },
      },
    },
    a11y: { test: 'todo' },
  },
  initialGlobals: {
    backgrounds: { value: 'hormigon' },
  },
};

export default preview;
