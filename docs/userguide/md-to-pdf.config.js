// md-to-pdf config file (not CLI --pdf-options) for the release userguide PDF.
//
// Why a config file and not `--pdf-options` on the CLI: md-to-pdf's CLI
// `--pdf-options` *replaces* the whole `pdf_options` object wholesale, while a
// `--config-file` is require()'d and *merged* on top of md-to-pdf's own
// defaults ({...defaults.pdf_options, ...configFile.pdf_options}). Using
// `--pdf-options` here would silently drop the default `format: 'a4'`,
// `printBackground: true` and the page `margin` (30mm/40mm/30mm/20mm) that
// release.yml relies on today - a config file keeps all of that and only adds
// the footer/header keys below.
//
// Why `displayHeaderFooter` is set explicitly: md-to-pdf normally auto-enables
// it when it sees a header/footer template, but that auto-enable happens
// *before* CLI/config merging runs, so relying on it here would race the
// merge. Setting it to `true` directly avoids depending on that ordering.
//
// `headerTemplate` is an empty-but-present `<span></span>`: Puppeteer only
// falls back to its own default header (page URL + date) when the template is
// missing/empty-string, so an actually-present empty element suppresses it
// without adding any content of our own up top.
const releaseDate = new Intl.DateTimeFormat('de-AT', {
  dateStyle: 'long',
  timeZone: 'Europe/Vienna', // runners are UTC; render the date as if in Vienna
}).format(new Date());

// Set by the release workflow's "Render userguide PDF" step; falls back to
// 'dev' so a local render (e.g. for manual verification) doesn't need the CI
// env var.
const version = process.env.USERGUIDE_VERSION || 'dev';

// Matches the page's left/right margin (20mm / 40mm, see comment above) so
// the footer text lines up with the body content above it.
const footerTemplate = `
  <div style="width:100%; font-size:9px; color:#888; padding:0 40mm 0 20mm; display:flex; justify-content:space-between;">
    <span>Version ${version} &middot; Stand: ${releaseDate}</span>
    <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
  </div>
`;

module.exports = {
  pdf_options: {
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate,
  },
};
