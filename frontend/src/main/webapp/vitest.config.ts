/// <reference types="vitest" />
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    server: {
      deps: {
        inline: [
          '@coreui/angular-chartjs',
          '@coreui/chartjs'
        ]
      }
    }
  },
});
