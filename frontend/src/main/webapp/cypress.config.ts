import {defineConfig} from 'cypress';

export default defineConfig({
  builder: '@cypress/schematic:cypress',
  viewportWidth: 1280,
  viewportHeight: 1024,
  videoCompression: false,
  video: true,
  env: {
    'browserPermissions': {
      'camera': 'allow'
    }
  },
  e2e: {
    experimentalRunAllSpecs: true,
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {

        if (browser.family === 'chromium' && browser.name !== 'electron') {
          /*
          if (Cypress.platform === 'linux') {
          }
           */

          /*
          // Linux
          launchOptions.args.push(
            '--use-file-for-fake-video-capture=cypress/fixtures/webcam/qr-code.y4m'
          );
          */

          // Windows
          // launchOptions.args.push('--use-file-for-fake-video-capture=D:\\development\\repos\\wrk-admin\\frontend\\src\\main\\webapp\\cypress\\fixtures\\webcam\\qr-code.y4m');
        }

        // return launchOptions;
      });

      return require('./cypress/plugins/index.ts')(on, config);
    },
    baseUrl: 'http://localhost:4200/'
  },
});
