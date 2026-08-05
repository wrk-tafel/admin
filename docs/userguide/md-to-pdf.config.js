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
  /* p:has(img)/h1-h4 break-before/after: avoid below are soft hints scoped to a *single* box.
     Keeping an intro paragraph glued to the image or list it introduces needs a *pair* of sibling
     boxes to move together, and pairing break-after: avoid on one box with break-before: avoid on
     its neighbour turned out not to reliably keep them together in Chromium's print engine: if the
     intro paragraph alone already fits the remaining space on the page, Chromium happily breaks
     right after it and pushes only the next box (image/list) to the next page - it doesn't
     backtrack and push the paragraph down too, even though both sides asked to avoid that break.
     The 'keep-together' wrapper (built by the script below) sidesteps this entirely by making the
     pair a *single* box, where break-inside: avoid is a strong, reliably-honoured constraint. */
  .keep-together {
    break-inside: avoid;
  }

  /* Standalone images (no intro paragraph immediately before them, so not wrapped above) still get
     a baseline break-inside: avoid so the image itself is never split across a page break. */
  p:has(img) {
    break-inside: avoid;
  }

  /* Same for headings, which would otherwise sometimes end up alone at the bottom of a page with
     their section's actual content pushed to the next one. This is the one-sided case (a box's own
     break-after against the normal flow that follows it) rather than the two-sided pairing above,
     which is why it doesn't hit the same Chromium limitation. */
  h1, h2, h3, h4 {
    break-after: avoid;
    break-inside: avoid;
  }

  /* Keep a single paragraph, list item, or table row from being split across a page break. */
  p, li, tr {
    break-inside: avoid;
  }

  /* Keep an entire bullet/numbered list on one page rather than starting it mid-list on a fresh
     page - every list in this guide is short enough to fit on a single page, so there's no
     multi-page list this would force to (unsuccessfully) fight for space. */
  ul, ol {
    break-inside: avoid;
  }

  /* Start every chapter (README.md's own title plus each of the module files) on a fresh page.
     This replaces what used to be a manually inserted page-break div between chapters in the
     workflow's concatenation step, so a new chapter file added there gets the same treatment for
     free. */
  h1 {
    break-before: page;
  }

  /* Frame every screenshot with a thin border - most of the app's own UI has no visible edge
     against the white page background (e.g. the login page's dark card blends into surrounding
     whitespace without one), so an unbordered screenshot can look like it's bleeding into the
     page rather than being a discrete figure. */
  img {
    border: 1px solid #000;
  }
`;

// Runs in the rendered page (via Puppeteer's page.addScriptTag(), see the `script` key below)
// *before* PDF generation, so document.querySelectorAll sees the final markdown->HTML output.
// Wraps each "intro paragraph + the image/list it introduces" pair in a `.keep-together` div - see
// the comment on that class above for why a wrapper (one box) succeeds where paired break-before/
// break-after avoid hints on two separate sibling boxes did not.
const keepTogetherScript = `
  (function () {
    function wrap(intro, target) {
      var wrapper = document.createElement('div');
      wrapper.className = 'keep-together';
      intro.parentNode.insertBefore(wrapper, intro);
      wrapper.appendChild(intro);
      wrapper.appendChild(target);
    }

    function wrapWithNextSibling(introSelector) {
      Array.from(document.querySelectorAll(introSelector)).forEach(function (intro) {
        var target = intro.nextElementSibling;
        if (target) wrap(intro, target);
      });
    }

    // Not expressed as a single 'p:has(+ p:has(img))' selector: :has() cannot contain another
    // :has() in its argument per the CSS Selectors spec (Chromium throws
    // "'...' is not a valid selector" for it), so the sibling-with-an-image check is done as a
    // plain previousElementSibling walk instead.
    Array.from(document.querySelectorAll('p:has(img)')).forEach(function (imgParagraph) {
      var intro = imgParagraph.previousElementSibling;
      if (intro && intro.tagName === 'P') wrap(intro, imgParagraph);
    });

    wrapWithNextSibling('p:has(+ ul)');
    wrapWithNextSibling('p:has(+ ol)');
  })();
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
  script: [{ content: keepTogetherScript }],
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
