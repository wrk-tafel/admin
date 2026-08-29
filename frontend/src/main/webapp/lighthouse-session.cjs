// Puppeteer script for the `pages` matrix of the `lighthouse` pipeline job
// (.github/workflows/subflow_lighthouse.yml), invoked by lhci once per audited URL before Lighthouse
// runs against it (`collect.puppeteerScript` in lighthouserc.pages.cjs).
//
// Its first job is to put the session into the browser's own cookie jar. A request header is not an
// option: Chrome rebuilds the `Cookie` header of every request from that jar, so a `Cookie` set
// through `Network.setExtraHTTPHeaders` - which is what Lighthouse's `extraHeaders` uses - never
// reaches the server. The application would then load, get a 401 from GET /api/users/info while
// bootstrapping, and redirect to the login page, so every audited route would silently grade the
// login page instead of itself.
//
// The cookie has to survive Lighthouse's own storage reset as well, hence `disableStorageReset` in
// lighthouserc.pages.cjs - see the note there for why that does not warm the cache.
const JWT_COOKIE_NAME = 'tafel-admin-jwt';

// lhci reuses one browser instance for a whole shard's collect run, but that instance still pays a
// one-off cost - GPU/network-service process spin-up, JIT warm-up - the first time a page actually
// navigates in it. Confirmed locally: the very first navigation after launch measured roughly twice
// the FCP/LCP of every navigation after it, on the same URL. Lighthouse's own first measured
// navigation is whichever URL happens to sit first in the shard's LHCI_URLS (`/login` in the
// `allgemein` shard - see subflow_lighthouse.yml), so without a warm-up that URL's score is skewed
// low by an artifact of running first, not by anything about the page itself. Paying that cost once
// here, on a throwaway page before Lighthouse's own first navigation, keeps every audited URL's
// score comparable regardless of where it lands in its shard's list.
let hasWarmedUpBrowser = false;

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {{url: string}} context
 */
module.exports = async (browser, context) => {
  const jwt = process.env.LHCI_JWT;
  if (!jwt) {
    throw new Error('LHCI_JWT is empty - every authenticated route would redirect to the login page.');
  }

  const {hostname} = new URL(context.url);

  // Set on the browser's default context, which is the one Lighthouse audits in.
  await browser.setCookie({
    name: JWT_COOKIE_NAME,
    value: jwt,
    domain: hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict'
  });

  if (!hasWarmedUpBrowser) {
    hasWarmedUpBrowser = true;
    const warmupPage = await browser.newPage();
    try {
      // `domcontentloaded`, not `networkidle*` - an authenticated screen holds an SSE stream open
      // (see the `blockedUrlPatterns` note in lighthouserc.pages.cjs) and this plain puppeteer page
      // has no request blocking of its own, so waiting for network idle here would hang on exactly
      // the shards whose first URL is one of those screens.
      await warmupPage.goto(context.url, {waitUntil: 'domcontentloaded', timeout: 15000});
    } catch {
      // Best-effort - Lighthouse's own measured navigation runs right after this regardless, and
      // simply pays whatever cold-start cost is left if the warm-up itself didn't complete.
    } finally {
      await warmupPage.close();
    }
  }
};
