/// <reference types="vitest" />
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Default (5s) is too tight on loaded CI runners and can compound into cascading
    // "Failed to fetch dynamically imported module" failures once the dev server falls behind.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Switched on by `--coverage` in the test-ci script, so a local `npm test` stays fast; these are
    // only the settings that run applies. The report exists for SonarCloud
    // (sonar.javascript.lcov.reportPaths in the root build.gradle.kts), which is why lcovonly is the
    // only file reporter - nobody opens an HTML report from a CI runner.
    coverage: {
      // Vitest's default, and since v3.2 its AST-based remapping is as accurate as istanbul's
      // instrumentation while staying faster; it works in this browser-mode setup via CDP.
      provider: 'v8',
      // `projectRoot` is what makes the paths in lcov.info resolvable by the scanner. Without it
      // they come out relative to this directory ("src/app/..."), while the Sonar analysis runs
      // from the repository root and would look for them there - the report parses, resolves
      // nothing, and coverage silently stays absent. Four levels up is the repo root, so the
      // recorded paths read "frontend/src/main/webapp/src/app/...".
      reporter: [['lcovonly', {projectRoot: '../../../..'}], 'text-summary'],
    },
  },
});
