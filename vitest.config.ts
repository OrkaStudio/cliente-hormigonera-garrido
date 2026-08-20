import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // aria-query es CJS y llega sin pre-bundlear al navegador, así que
  // `elementRoles` no existe como named export y el setup de addon-vitest
  // no puede importarse. Forzando el pre-bundleo, Vite lo convierte a ESM.
  optimizeDeps: {
    include: ['aria-query', '@testing-library/dom'],
  },
  test: {
    projects: [
      // Las funciones puras del dominio. Corren en node y sin navegador:
      // son cálculo, no pintura. Las historias de Storybook cubren "esto
      // se ve"; esto cubre "esto da bien", que es donde de verdad se
      // rompe un total.
      {
        extends: true,
        test: {
          name: 'unidad',
          environment: 'node',
          include: ['lib/**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
