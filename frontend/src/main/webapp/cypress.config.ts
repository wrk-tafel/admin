import {defineConfig} from 'cypress';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {createHmac} from 'crypto';

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

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * The 6-digit code an authenticator app shows for [secret] (RFC 6238: HMAC-SHA1, 30 second steps), for
 * the current step moved by [stepOffset] - a spec plays the authenticator app with this. The backend
 * accepts the step before and the one after the current one, and each code only once, so a spec that
 * needs several uses them in the order -1, 0, +1.
 */
function totpCode(secret: string, stepOffset: number): string {
  let buffer = 0;
  let bitsLeft = 0;
  const key: number[] = [];
  for (const char of secret.replace(/[\s=]/g, '').toUpperCase()) {
    buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(char);
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      key.push((buffer >>> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }

  const step = Math.floor(Date.now() / 30000) + stepOffset;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', Buffer.from(key)).update(counter).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return (binary % 1000000).toString().padStart(6, '0');
}

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
        // Anything a spec needs to end up in the run's terminal output rather than only in the
        // Cypress command log, which in CI is recorded into the video and nothing else - used by
        // the axe assertions (cypress/support/accessibility.ts) to make a failure readable.
        log(message: string) {
          console.log(message);
          return null;
        },
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
        },
        totpCode({secret, stepOffset = 0}: { secret: string; stepOffset?: number }) {
          return totpCode(secret, stepOffset);
        }
      });
    },
    baseUrl: 'http://localhost:4200/',
    defaultCommandTimeout: 10000,
  },
});
