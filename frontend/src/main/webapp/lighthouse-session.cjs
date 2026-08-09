// Puppeteer script for the `pages` matrix of the `lighthouse` pipeline job
// (.github/workflows/subflow_lighthouse.yml), invoked by lhci once per audited URL before Lighthouse
// runs against it (`collect.puppeteerScript` in lighthouserc.pages.cjs).
//
// Its only job is to put the session into the browser's own cookie jar. A request header is not an
// option: Chrome rebuilds the `Cookie` header of every request from that jar, so a `Cookie` set
// through `Network.setExtraHTTPHeaders` - which is what Lighthouse's `extraHeaders` uses - never
// reaches the server. The application would then load, get a 401 from GET /api/users/info while
// bootstrapping, and redirect to the login page, so every audited route would silently grade the
// login page instead of itself.
//
// The cookie has to survive Lighthouse's own storage reset as well, hence `disableStorageReset` in
// lighthouserc.pages.cjs - see the note there for why that does not warm the cache.
const JWT_COOKIE_NAME = 'tafel-admin-jwt';

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
};
