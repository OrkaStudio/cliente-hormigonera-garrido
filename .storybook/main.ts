import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    // Fundamentos: paleta, tipografía y semáforo. Se leen antes de construir.
    '../stories/fundamentos/**/*.mdx',
    // Los componentes viven al lado de su código, no en una carpeta aparte.
    '../components/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    // WSL sobre /mnt/d: el watcher nativo no ve los cambios del disco de
    // Windows y Storybook sirve archivos viejos. Sin polling, editás y no
    // pasa nada. Mismo problema que ya nos comió tiempo en Risso y en GL.
    config.server = {
      ...config.server,
      watch: { ...config.server?.watch, usePolling: true, interval: 300 },
    };
    return config;
  },
};

export default config;
