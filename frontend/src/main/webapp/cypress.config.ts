import {defineConfig} from 'cypress';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Mirrors `tafeladmin.storage.scannerPath` in application-e2e.yml (`${java.io.tmpdir}/tafeladmin-e2e-scanner-inbox`) -
// os.tmpdir() and Java's java.io.tmpdir resolve to the same OS-level temp directory on the machine
// running both the Cypress process and the backend under test (true both locally and in CI, where
// they run on the same runner), unlike `user.dir`, which differs between a local `bootRun` and the
// CI job's `java -jar` invocation. The backend under test always runs with the "e2e" profile
// (application-e2e.yml) - that's the profile that exists specifically for this - so there's only
// ever one location to write to.
const scannerInboxDir = path.join(os.tmpdir(), 'tafeladmin-e2e-scanner-inbox');

// Mirrors `spring.config.import` in application-e2e.yml - the optional file the backend re-reads its
// configuration from while running (see ConfigFileReloadService), in the same shared temp directory
// and for the same reason as the scanner inbox above. Writing it is how a spec exercises an operator
// editing the deployment's config, which the backend picks up without a restart.
const backendConfigFile = path.join(os.tmpdir(), 'tafeladmin-e2e-config.yml');

export default defineConfig({
  builder: '@cypress/schematic:cypress',
  // 1024x768 is the smallest desktop resolution still used in production
  // (right at the app's mobile/desktop breakpoint), so it's the baseline for
  // all specs. Individual specs additionally test PHONE_VIEWPORT/TABLET_VIEWPORT
  // (see cypress/support/viewports.ts) for pages with responsive layouts.
  viewportWidth: 1024,
  viewportHeight: 768,
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

      on('task', {
        writeScannerFile({fileName, content}: { fileName: string; content: string }) {
          fs.mkdirSync(scannerInboxDir, {recursive: true});
          fs.writeFileSync(path.join(scannerInboxDir, fileName), content);
          return null;
        },
        clearScannerInbox() {
          fs.rmSync(scannerInboxDir, {recursive: true, force: true});
          return null;
        },
        writeBackendConfig(content: string) {
          fs.writeFileSync(backendConfigFile, content);
          return null;
        },
        clearBackendConfig() {
          fs.rmSync(backendConfigFile, {force: true});
          return null;
        }
      });
    },
    baseUrl: 'http://localhost:4200/',
    defaultCommandTimeout: 10000,
  },
});
