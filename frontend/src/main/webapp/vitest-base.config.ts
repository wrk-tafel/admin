/// <reference types="vitest" />
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Default (5s) is too tight on loaded CI runners and can compound into cascading
    // "Failed to fetch dynamically imported module" failures once the dev server falls behind.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
