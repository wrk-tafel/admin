// Lighthouse CI configuration for the `lighthouse` pipeline job (.github/workflows/subflow_lighthouse.yml).
// See docs/architecture/adr/0036-page-performance-index-in-the-pipeline.md for why the measurement is
// shaped this way - in particular why it audits the login page against a static server rather than a
// logged-in screen against the real backend.
//
// Run it locally against the same config CI uses (from this directory, after `npm run build-prod`);
// the job installs the same pinned version explicitly instead of resolving it on demand:
//   npx --yes @lhci/cli@0.15.1 autorun --config=lighthouserc.cjs
module.exports = {
  ci: {
    collect: {
      // The production bundle exactly as it is deployed - the same `frontend-dist` artifact the
      // image is built from. lhci serves it itself (gzip included), so this job needs neither the
      // backend jar nor a database.
      staticDistDir: 'dist/browser',
      // Serve index.html for any path that isn't a file, so the Angular route below is reachable.
      isSinglePageApplication: true,
      // The port is assigned by lhci's own server and substituted into this URL.
      url: ['http://localhost/login'],
      // Three runs, because a single run on a shared CI runner is noise. `median-run` below reduces
      // them to one representative run.
      numberOfRuns: 3,
      settings: {
        // This is a desktop admin application - Lighthouse's default mobile emulation (4x CPU
        // throttling, slow 4G) would rate a screen nobody opens on a phone.
        preset: 'desktop',
        // SEO is meaningless for an application that is entirely behind a login and deliberately
        // not indexable; skipping the category keeps the run shorter and the report focused.
        onlyCategories: ['performance', 'accessibility', 'best-practices']
      }
    },
    assert: {
      // Assert the values of the single median run instead of per-audit medians, so every number in
      // a failure message comes from the same page load and can be reproduced from the uploaded
      // report of that run.
      aggregationMethod: 'median-run',
      assertions: {
        // Every threshold below sits above the measured baseline of this bundle (the numbers in the
        // comments), with room for a CI runner being slower than a developer machine - the point is
        // to catch a regression, not a busy runner. The job summary prints the current values on
        // every run; when they have improved for good, tighten these with them.

        // Baseline 1.00. 0.9 is the bound Lighthouse itself calls "good".
        'categories:performance': ['error', {minScore: 0.9}],
        // Baseline 1.00, and accessibility audits are deterministic - they grade the markup, not the
        // machine - so this one is held at the full score rather than given noise headroom.
        'categories:accessibility': ['error', {minScore: 1}],
        // Baseline 1.00, but a warning rather than an error: part of this category grades the server
        // (cache headers, CSP, HTTPS) and the server here is lhci's static one, not the Spring Boot
        // container that serves these files in production.
        'categories:best-practices': ['warn', {minScore: 0.9}],

        // Metric ceilings in milliseconds. Baselines: FCP ~0.42s, LCP ~0.72s, TBT 0ms.
        'first-contentful-paint': ['error', {maxNumericValue: 1500}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2000}],
        'total-blocking-time': ['warn', {maxNumericValue: 400}],
        // Baseline 0.042. Layout shift is a property of the page, not of the machine measuring it,
        // so it gets the strict Core Web Vitals bound.
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],

        // Transfer-size ceilings in bytes, gzip applied, for what a first visit actually pulls in.
        // Fonts measured at 44 kB. The script ceiling is derived rather than measured here: the
        // build's own `check-eager-bundle.cjs` reports 235 kB gzipped over 6 eager files, against
        // the 276 kB it measured for the payload Lighthouse rated 284 kB over 3 files - so roughly
        // 240 kB of script and 305 kB in total, and the ceilings below keep the same headroom the
        // previous ones had. The job summary prints what was really measured; tighten these to it.
        //
        // This is the layer angular.json's `initial` budget cannot cover - see the header of
        // `check-eager-bundle.cjs` for why the builder cannot see the eager payload at all. That
        // check bounds the raw bytes deterministically at build time; what Lighthouse adds here is
        // what the browser really downloaded, compression and request count included.
        'resource-summary:script:size': ['error', {maxNumericValue: 300000}],
        'resource-summary:font:size': ['error', {maxNumericValue: 60000}],
        'resource-summary:total:size': ['error', {maxNumericValue: 370000}]

        // Nothing else is asserted. No `preset` is set on purpose, so the individual audits
        // Lighthouse reports on (unused JavaScript, cache lifetimes, source maps, ...) show up in the
        // uploaded report without any of them being able to fail the build on their own.
      }
    },
    upload: {
      // Written into the workspace and uploaded as a build artifact - no external Lighthouse server
      // and no public report storage involved.
      target: 'filesystem',
      outputDir: '.lighthouseci/reports'
    }
  }
};
