// md-to-pdf config file for the release userguide PDF. This is the single place the render is
// configured - the workflow only concatenates the chapters and invokes md-to-pdf with
// `--config-file md-to-pdf.config.js`, no other flags.
//
// Why a config file and not CLI flags such as `--pdf-options`: md-to-pdf's CLI `--pdf-options`
// *replaces* the whole `pdf_options` object wholesale, while a `--config-file` is require()'d and
// *merged* on top of md-to-pdf's own defaults ({...defaults.pdf_options, ...configFile.pdf_options}).
// Using `--pdf-options` would silently drop defaults this relies on (notably `printBackground:
// true`) - the config file keeps those and overrides only the keys below.

// Set by the release workflow's "Render userguide PDF" step; falls back to 'dev' so a local render
// (e.g. for manual verification) doesn't need the CI env var.
const version = process.env.USERGUIDE_VERSION || 'dev';

const releaseDate = new Intl.DateTimeFormat('de-AT', {
  dateStyle: 'long',
  timeZone: 'Europe/Vienna', // runners are UTC; render the date as if in Vienna
}).format(new Date());

// Uniform page margin on all four sides. md-to-pdf's own defaults are asymmetric (30mm top / 40mm
// right / 30mm bottom / 20mm left), which leaves the text block visibly off-centre on the page, so
// all four are pinned to 20mm here. The footer reuses the constant as its horizontal padding to
// stay aligned with the body text above it.
const pageMargin = '20mm';

// Document styles, injected as a style tag *after* every entry in `stylesheet`, so they layer on
// top of md-to-pdf's default markdown.css. Overriding `stylesheet` instead would replace that
// default outright and lose the base styling.
const css = `
  /* Keep each screenshot glued to the paragraph introducing it: without this, a page break can
     land between the two, leaving an image alone at the top of a page with its explanation
     stranded on the previous one. */
  p:has(img) {
    break-before: avoid;
    break-inside: avoid;
  }

  /* Same for headings, which would otherwise sometimes end up alone at the bottom of a page with
     their section's actual content pushed to the next one. */
  h1, h2, h3, h4 {
    break-after: avoid;
    break-inside: avoid;
  }

  /* Start every chapter (README.md's own title plus each of the module files) on a fresh page.
     This replaces what used to be a manually inserted page-break div between chapters in the
     workflow's concatenation step, so a new chapter file added there gets the same treatment for
     free. */
  h1 {
    break-before: page;
  }
`;

// Puppeteer renders header/footer templates in a separate document that does *not* inherit the
// page's stylesheets (i.e. the `css` above never reaches it), so the footer's styles have to
// travel inside the template itself.
const footerTemplate = `
  <style>
    .pdf-footer {
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding: 0 ${pageMargin};
      font-size: 11px;
      color: #888;
    }
  </style>
  <div class="pdf-footer">
    <span>Stand: ${releaseDate}, Version: ${version}</span>
    <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
  </div>
`;

module.exports = {
  // Without a document title, md-to-pdf falls back to the URL of the local http server it serves
  // combined.md from (e.g. "localhost:PORT/combined.md"), which then shows up as the PDF's title
  // in viewers/tabs.
  document_title: 'Tafel Admin – Benutzerhandbuch',
  launch_options: {
    // The workflow installs with `npm ci --ignore-scripts`, which skips puppeteer's postinstall
    // Chromium download, so it detects the runner's preinstalled Chrome and exports its path here.
    // Undefined locally (falls back to puppeteer's own resolution) unless CHROME_PATH is set - on
    // Windows e.g. CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe".
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  },
  css,
  pdf_options: {
    // Explicit rather than inherited from md-to-pdf's defaults so the page geometry is stated in
    // one place: A4 portrait (`landscape: false`), 2cm on every side.
    format: 'a4',
    landscape: false,
    margin: {
      top: pageMargin,
      right: pageMargin,
      bottom: pageMargin,
      left: pageMargin,
    },
    // md-to-pdf normally auto-enables this when it sees a header/footer template, but that
    // auto-enable runs *before* config merging, so it's set explicitly rather than relying on
    // that ordering.
    displayHeaderFooter: true,
    // An empty-but-present element: Puppeteer only falls back to its own default header (page URL
    // + date) when the template is missing/empty-string, so this suppresses it without adding any
    // content of our own up top.
    headerTemplate: '<span></span>',
    footerTemplate,
  },
};
