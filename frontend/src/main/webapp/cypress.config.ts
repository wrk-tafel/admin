import {defineConfig} from 'cypress';
import * as path from 'path';

export default defineConfig({
  builder: '@cypress/schematic:cypress',
  viewportWidth: 1280,
  viewportHeight: 1024,
  videoCompression: false,
  video: true,
  allowCypressEnv: false,
  e2e: {
    experimentalRunAllSpecs: true,
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        // Cypress already grants fake camera/mic access for chromium browsers
        // (--use-fake-ui-for-media-stream / --use-fake-device-for-media-stream),
        // so no permissions plugin is needed. We just point the fake camera at
        // a video containing a real QR code, so scanner.cy.ts can exercise the
        // actual scan/decode pipeline instead of only checking readiness.
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          const qrCodeVideoPath = path.resolve(__dirname, 'cypress/fixtures/webcam/qr-code.y4m');
          launchOptions.args.push(`--use-file-for-fake-video-capture=${qrCodeVideoPath}`);
        }

        return launchOptions;
      });
    },
    baseUrl: 'http://localhost:4200/',
    defaultCommandTimeout: 10000,
  },
});
