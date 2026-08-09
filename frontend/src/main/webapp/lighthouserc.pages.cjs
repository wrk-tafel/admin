// Lighthouse CI configuration for the `pages` matrix of the `lighthouse` pipeline job
// (.github/workflows/subflow_lighthouse.yml): every route of the application, desktop and mobile,
// audited against a real backend. See
// docs/architecture/adr/0036-page-performance-index-in-the-pipeline.md for why this sweep enforces
// accessibility while the transfer-size and performance thresholds stay on the shell audit in
// lighthouserc.cjs.
//
// The audited routes, the form factor and the session come in through the environment, so the
// workflow's matrix is the single place the page list is maintained:
//   LHCI_URLS         comma-separated application paths, e.g. "/uebersicht,/kunden/suchen"
//   LHCI_FORM_FACTOR  "desktop" or "mobile"
//   LHCI_JWT          value of the tafel-admin-jwt cookie from POST /api/login
//   LHCI_BASE_URL     origin the backend serves the application on (default http://localhost:8080)
const BASE_URL = process.env.LHCI_BASE_URL || 'http://localhost:8080';
const FORM_FACTOR = process.env.LHCI_FORM_FACTOR || 'desktop';
const JWT_COOKIE_NAME = 'tafel-admin-jwt';

const paths = (process.env.LHCI_URLS || '')
  .split(',')
  .map(path => path.trim())
  .filter(path => path.length > 0);

// Failing loudly beats auditing nothing and reporting success: an empty list or a missing session
// would otherwise produce a green job that measured zero pages, or thirty redirects to /login.
if (paths.length === 0) {
  throw new Error('LHCI_URLS is empty - no page to audit.');
}
if (!process.env.LHCI_JWT) {
  throw new Error('LHCI_JWT is empty - every authenticated route would redirect to the login page.');
}
if (FORM_FACTOR !== 'desktop' && FORM_FACTOR !== 'mobile') {
  throw new Error(`LHCI_FORM_FACTOR must be "desktop" or "mobile", was "${FORM_FACTOR}".`);
}

module.exports = {
  ci: {
    collect: {
      url: paths.map(path => `${BASE_URL}${path}`),
      // Two runs, median below - enough to keep a busy runner from deciding a score, without
      // doubling a sweep that already covers every route twice over (desktop and mobile).
      numberOfRuns: 2,
      settings: {
        // Lighthouse's own default is the mobile emulation (4x CPU throttling, slow 4G), so the
        // mobile half of the matrix is the absence of a preset rather than a setting of its own.
        ...(FORM_FACTOR === 'desktop' ? {preset: 'desktop'} : {}),
        // SEO is meaningless for an application that is entirely behind a login and deliberately
        // not indexable; skipping the category keeps the run shorter and the report focused.
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        // The session, as a request header rather than a scripted UI login. The application loads
        // its user info from GET /api/users/info while bootstrapping (provideAppInitializer in
        // app.config.ts), so a JWT on every request is all an authenticated route needs - and
        // because nothing is written to the browser's own storage, Lighthouse can keep resetting
        // it between runs and every run still measures a cold cache.
        extraHeaders: {Cookie: `${JWT_COOKIE_NAME}=${process.env.LHCI_JWT}`},
        // Lighthouse ends a page load when the network goes quiet, and every authenticated screen
        // holds SSE streams open, which means it never would. Blocking them lets a run settle;
        // SseService then retries the blocked stream with a delay doubling from 1s to a 30s
        // ceiling, so quiet arrives once that gap exceeds Lighthouse's quiet window - a good ten
        // seconds into each run, which is why this sweep is slower per page than the shell audit.
        blockedUrlPatterns: ['*/api/sse/*']
      }
    },
    assert: {
      // Assert the values of the single median run instead of per-audit medians, so every number in
      // a failure message comes from the same page load and can be reproduced from the uploaded
      // report of that run.
      aggregationMethod: 'median-run',
      assertions: {
        // The one error in this sweep. Accessibility audits grade the markup, not the machine, so
        // they give the same answer on a loaded runner as on a developer laptop and on a screen
        // whose content depends on test data - which is exactly what makes them worth enforcing on
        // every route, where a performance threshold would only produce noise.
        'categories:accessibility': ['error', {minScore: 1}],

        // Reported, not enforced. An authenticated screen renders whatever the e2e fixtures hold,
        // so its score moves when the test data moves; the numbers belong in the job summary as a
        // trend to watch, and the thresholds that actually block live on the shell audit in
        // lighthouserc.cjs, whose payload every one of these routes also pays.
        'categories:performance': ['warn', {minScore: 0.8}],
        // Part of this category grades the server (cache headers, CSP, HTTPS), and this runs
        // against a plain-HTTP localhost rather than the container behind its reverse proxy.
        'categories:best-practices': ['warn', {minScore: 0.9}]
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
