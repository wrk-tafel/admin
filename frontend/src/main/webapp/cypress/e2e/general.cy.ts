import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('General', () => {

  beforeEach(() => {
    cy.visit('/');
  });

  it('window title correct', () => {
    cy.contains('Tafel Admin');
  });

  it('redirects per default to login', () => {
    cy.url().should('include', '/login');
  });

  it('status 404 page visible with recovery actions', () => {
    cy.visit('/invalidpath');

    cy.byTestId('status').should('have.text', '404');
    cy.byTestId('title').should('have.text', 'Seite nicht gefunden');
    cy.byTestId('subtitle').should('have.text', 'Diese Bananenkiste ist wohl leer');

    cy.url().should('include', '/invalidpath');

    // unauthenticated: the overview link exists, but the auth guard sends it on to the login page
    cy.byTestId('backToOverviewButton').should('be.visible').and('have.text', 'Zur Übersicht').click();
    cy.url().should('include', '/login');
  });

  it('status 500 page visible with recovery actions', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');
    cy.visit('/500');

    cy.byTestId('status').should('have.text', '500');
    cy.byTestId('title').should('have.text', 'Houston, wir haben ein Problem!');
    cy.byTestId('subtitle').should('have.text', 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    cy.byTestId('supportHint').should('contain.text', 'Support-Anfrage');

    cy.url().should('include', '/500');

    cy.byTestId('backButton').should('be.visible').and('have.text', 'Zurück').click();
    cy.url().should('include', '/uebersicht');

    cy.visit('/500');
    cy.byTestId('backToOverviewButton').should('have.text', 'Zur Übersicht').click();
    cy.url().should('include', '/uebersicht');

    cy.visit('/500');
    cy.byTestId('reloadButton').should('have.text', 'Neu laden');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/invalidpath');

      cy.byTestId('status').should('be.visible').and('have.text', '404');
      cy.byTestId('title').should('be.visible').and('have.text', 'Seite nicht gefunden');
    });
  });

});

describe('API error responses', () => {

  // Both cases below answer 403, but only one of them is a permission problem. Telling them apart
  // from the response alone is what issue #2989 lacked: a batch of production 403s on
  // LOGISTICS-gated endpoints looked like an authorized session losing its authority, when a
  // permission denial could not have produced them at all.
  it('answers a permission denial with a german problem detail', () => {
    // e2etest2 only holds CUSTOMER, so the SETTINGS-gated car list is denied by @PreAuthorize
    cy.loginE2ETest2();

    cy.request({method: 'GET', url: '/api/cars', failOnStatusCode: false}).then((response) => {
      expect(response.status).to.eq(403);
      expect(response.body.title).to.eq('Zugriff verweigert');
      expect(response.body.detail).to.eq('Zugriff nicht erlaubt!');
    });
  });

  it('answers a CSRF-token failure with a 403 that carries no problem detail', () => {
    // the default user does hold SETTINGS - this 403 is purely about the mismatching CSRF token,
    // rejected by CsrfFilter before any controller (and therefore any @PreAuthorize) runs
    cy.loginDefault();

    cy.request({
      method: 'POST',
      url: '/api/cars',
      headers: {'X-XSRF-TOKEN': 'not-the-cookie-value'},
      body: {licensePlate: 'W-12345TA', name: 'CSRF test', enabled: true},
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(403);
      expect(response.body).to.not.have.property('detail');
      expect(response.body.error).to.eq('Forbidden');
    });
  });

  // A token is re-issued for every request that arrives without the cookie, and the SPA sends
  // several of those in parallel while it boots. Re-issuing a *different* value each time is what
  // made the cookie move underneath an already-sent request and produced sporadic 403s (#3101), so
  // what matters is that two re-issues of the same session agree.
  it('re-issues the same csrf token whenever the cookie is missing', () => {
    cy.loginDefault();

    cy.clearCookie('XSRF-TOKEN');
    cy.request('GET', '/api/users/info');

    cy.getCookie('XSRF-TOKEN').then((reissuedCookie) => {
      expect(reissuedCookie?.value).to.be.a('string');

      cy.clearCookie('XSRF-TOKEN');
      cy.request('GET', '/api/users/info');

      cy.getCookie('XSRF-TOKEN').should((cookieAfterSecondReissue) => {
        expect(cookieAfterSecondReissue!.value).to.eq(reissuedCookie!.value);
      });
    });
  });

  // The two below are answered by handlers inherited from Spring's ResponseEntityExceptionHandler,
  // not by anything this app wrote. They used to come back with the unresolved
  // "problemDetail.<exception class>" message *code* as detail (and as the problem type), which is
  // what the SPA puts straight into its error toast - see issue #3008.
  it('answers an unsupported request method with a german problem detail', () => {
    cy.loginDefault();

    cy.request({method: 'DELETE', url: '/api/cars', failOnStatusCode: false}).then((response) => {
      expect(response.status).to.eq(405);
      // 405 had no message key of its own at all, so the title used to be the raw
      // "http-error.405.title" key
      expect(response.body.title).to.eq('Aktion nicht erlaubt');
      expect(response.body.detail).to.eq('Diese Aktion ist für diese Adresse nicht erlaubt.');
    });
  });

  it('answers a path variable of the wrong type with a german problem detail', () => {
    cy.loginDefault();

    cy.request({method: 'GET', url: '/api/households/not-a-number', failOnStatusCode: false}).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.title).to.eq('Ungültige Aktion');
      expect(response.body.detail).to.eq('Die Anfrage war ungültig oder unvollständig.');
      expect(response.body).to.not.have.property('type');
    });
  });

});

describe('Accessibility', () => {

  it('titles every page after the route it shows', () => {
    cy.visit('/login');
    cy.title().should('eq', 'Anmeldung - Tafel Admin');

    cy.loginDefault();
    cy.visit('/uebersicht');
    cy.title().should('eq', 'Übersicht - Tafel Admin');

    cy.contains('a', 'Kunden suchen').click();
    cy.url().should('include', '/kunden/suchen');
    cy.title().should('eq', 'Kunden suchen - Tafel Admin');
  });

  it('offers a skip link that jumps past the navigation to the main content', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    // `sr-only` keeps the link at 1px until it has focus, so its width is what tells the two
    // states apart - Cypress' own visibility rules ignore the clipping that hides it.
    cy.byTestId('skip-to-content').then(($link) => {
      expect($link[0].getBoundingClientRect().width).to.be.lessThan(5);
    });

    cy.byTestId('skip-to-content').focus().then(($link) => {
      expect($link[0].getBoundingClientRect().width).to.be.greaterThan(50);
    });

    cy.byTestId('skip-to-content').click();
    cy.focused().should('have.attr', 'id', 'hauptinhalt');

    // It only skips anything if it comes before what it skips.
    cy.byTestId('skip-to-content').then(($link) => {
      cy.get('nav').then(($nav) => {
        // eslint-disable-next-line no-bitwise
        expect($link[0].compareDocumentPosition($nav[0]) & Node.DOCUMENT_POSITION_FOLLOWING).to.be.greaterThan(0);
      });
    });
  });

  // A client-side navigation announces nothing on its own - the document title changing is not
  // enough - so focus is what has to move into the page that just opened. Without it the next Tab
  // would carry on through the navigation the user just left.
  it('moves focus into the main content after an in-app navigation', () => {
    cy.loginDefault();
    cy.visit('/kunden/suchen');

    cy.contains('a', 'Übersicht').click();
    cy.url().should('include', '/uebersicht');

    cy.focused().should('have.attr', 'id', 'hauptinhalt');
  });

  // The exception to the rule above: a screen that autofocuses a control keeps focus there, which
  // is the whole point of a screen a scanner or a keyboard types straight into.
  it('leaves focus on the control a screen autofocuses itself', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.contains('a', 'Kunden suchen').click();
    cy.url().should('include', '/kunden/suchen');

    cy.focused().should('have.attr', 'testid', 'searchInputText');
  });

  // Everything the axe assertions below reach exists only after an interaction, which is what the
  // other two gates are blind to - see cypress/support/accessibility.ts.
  it('has no violations in the support dialog', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('supportButton').click();
    cy.byTestId('support-dialog').should('be.visible');

    cy.checkDialogAccessibility();
  });

  it('has no violations in the user menu', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('usermenu').click();

    cy.checkMenuAccessibility();
  });

  // Links to the always-latest release asset rather than a version pinned to this checkout, so the
  // link keeps working after every release without a code change - see release.yml's
  // github-release job. Asserted on the link itself (not by following it) since it points at an
  // external GitHub URL a spec shouldn't actually navigate to (and following it would only trigger
  // a download - see the template comment on why there is no target="_blank").
  it('links the user guide from the user menu', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-userguide')
      .should('contain.text', 'Benutzerhandbuch')
      .and('have.attr', 'href', 'https://github.com/wrk-tafel/admin/releases/latest/download/tafel-admin-benutzerhandbuch.pdf')
      .and('not.have.attr', 'target');
  });

  it('lets the keyboard reach and expand a collapsible nav group', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    // `be.visible` is load-bearing here, not decoration. Angular Material renders the sidenav's
    // content before it marks the drawer opened, so for a moment after the shell appears the whole
    // sidebar is still `visibility: hidden` and translated off-screen. `cy.contains()` matches on
    // existence alone and `.focus()` is one of the few commands that performs no actionability
    // check, so a run landing in that window asks the browser to focus an element it refuses to
    // focus - silently, leaving focus on `body` and failing the assertion below instead.
    cy.contains('button', 'Auswertungen')
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false')
      .focus();

    cy.focused().should('contain.text', 'Auswertungen').click();

    cy.contains('button', 'Auswertungen').should('have.attr', 'aria-expanded', 'true');
    cy.contains('a', 'Kunden über Limit').should('be.visible');
  });

});

describe('Sidebar Tooltips', () => {

  it('names a nav item through a tooltip once the sidebar is collapsed', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    // expanded: the name is written out next to the icon, so no tooltip is offered. The wait is
    // deliberate - without outlasting the configured 300ms show delay, "not.exist" would pass
    // before a tooltip that *is* on its way ever had the chance to appear.
    cy.contains('a', 'Übersicht').trigger('mouseenter');
    cy.wait(1000);
    cy.get('.mat-mdc-tooltip').should('not.exist');

    // the toggle carries a tooltip of its own ("Menü einklappen"), which the click shows - leave it
    // again so the assertion below can't accidentally read that one instead
    cy.byTestId('sidenav-collapse-toggle').click().trigger('mouseleave');
    cy.get('.mat-mdc-tooltip').should('not.exist');

    // collapsed: only the icon is left, so the name is only reachable through the tooltip
    cy.get('nav a').first().trigger('mouseenter');
    cy.get('.mat-mdc-tooltip').should('have.length', 1).and('have.text', 'Übersicht');
  });

});

describe('Navigation Progress Bar', () => {

  it('shows a top-level loading bar while a resolver-gated page is loading, and hides it once loaded', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    // navigate once first so the app is fully settled before triggering the navigation under test
    cy.contains('Kunden suchen').click();
    cy.url().should('include', '/kunden/suchen');

    // Route resolvers (e.g. the above-limit list's data fetch) block navigation before the target
    // component even mounts, so delay the response to give the bar time to actually be observed.
    cy.intercept('GET', '/api/households/above-limit*', (req) => {
      req.on('response', (res) => {
        res.setDelay(2000);
      });
    }).as('aboveLimit');

    cy.byTestId('nav-progress-bar').should('not.exist');
    // "Kunden über Limit" lives under the collapsible "Auswertungen" nav group - expand it first
    cy.contains('button', 'Auswertungen').click();
    cy.contains('Kunden über Limit').click();

    cy.byTestId('nav-progress-bar').should('be.visible');

    cy.wait('@aboveLimit');

    cy.byTestId('nav-progress-bar').should('not.exist');
    cy.url().should('include', '/kunden/ueber-limit');
  });

});

// A navigation can fail without the URL being wrong at all - see `navigation-error-handler.ts`.
// Which of the three outcomes below applies is decided by whether there is a page to stay on and
// by whether the failure means "not there" or "not right now".
describe('Navigation Errors', () => {

  it('keeps the current page open when a sidebar navigation cannot load its data', () => {
    cy.loginDefault();
    cy.visit('/kunden/suchen');

    cy.intercept('GET', '/api/shelters/active', {statusCode: 503, body: {}}).as('shelters');

    cy.contains('a', 'Übersicht').click();
    cy.wait('@shelters');

    cy.contains('.toast-message', 'Die Daten für diese Seite konnten nicht geladen werden')
      .should('be.visible');
    // still on the screen the click started from, and not on an error page
    cy.url().should('include', '/kunden/suchen');
    cy.byTestId('searchInputText').should('be.visible');
  });

  it('shows the 404 page when a directly opened page addresses a record that is not there', () => {
    cy.loginDefault();

    cy.intercept('GET', '/api/households/999999', {statusCode: 404, body: {}}).as('household');

    cy.visit('/kunden/detail/999999');
    cy.wait('@household');

    cy.byTestId('status').should('have.text', '404');
    cy.byTestId('title').should('have.text', 'Seite nicht gefunden');
  });

  it('shows the 500 page when a directly opened page fails for a technical reason', () => {
    cy.loginDefault();

    cy.intercept('GET', '/api/shelters/active', {statusCode: 503, body: {}}).as('shelters');

    cy.visit('/uebersicht');
    cy.wait('@shelters');

    cy.byTestId('status').should('have.text', '500');
    cy.byTestId('title').should('have.text', 'Houston, wir haben ein Problem!');
  });

});

describe('Shell', () => {

  it('shows the environment label as a banner in the header, matching the login page', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('environment-banner').should('be.visible').and('contain.text', 'E2E');
  });

  it('shows the distribution state in the header, next to the Live-Verbindung badge, with its start time once open', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('distribution-state-badge').should('contain.text', 'Ausgabe geschlossen');

    cy.createDistribution();
    cy.reload();

    cy.byTestId('distribution-state-badge').should('contain.text', 'Ausgabe geöffnet');
    cy.byTestId('distribution-state-badge').invoke('text').should('match', /\d{2}:\d{2}/);

    cy.closeDistribution();
  });

  it('disables a distribution-gated nav entry with a tooltip explaining why, instead of hiding it', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.contains('a', 'Waren-Eingabe')
      .should('be.visible')
      .and('have.attr', 'aria-disabled', 'true')
      .trigger('mouseenter');
    cy.get('.mat-mdc-tooltip').should('have.text', 'Keine Verteilung aktiv');
  });

  it('groups the Einstellungen submenu into labeled sub-groups instead of one flat list', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.contains('button', 'Einstellungen').click();

    cy.contains('Stammdaten').should('be.visible');
    cy.contains('Systemverwaltung').should('be.visible');
    cy.contains('a', 'Fahrzeuge').should('be.visible');
    cy.contains('a', 'Mitarbeiter').should('be.visible');
  });

  it('remembers the collapsed sidebar and an expanded nav group across a reload', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.contains('button', 'Auswertungen').click();
    cy.byTestId('sidenav-collapse-toggle').click();
    // collapsed: the toggle's own tooltip is what names the state, since the nav entry names
    // themselves stop being written out once collapsed
    cy.byTestId('sidenav-collapse-toggle').trigger('mouseenter');
    cy.get('.mat-mdc-tooltip').should('have.text', 'Menü ausklappen');

    cy.reload();

    cy.byTestId('sidenav-collapse-toggle').trigger('mouseenter');
    cy.get('.mat-mdc-tooltip').should('have.text', 'Menü ausklappen');

    // un-collapse again to be able to read the expanded group's own state
    cy.byTestId('sidenav-collapse-toggle').click();
    cy.contains('button', 'Auswertungen').should('have.attr', 'aria-expanded', 'true');
  });

  it('shows the active page title in the header on mobile, where the sidebar starts closed', () => {
    cy.loginDefault();
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/uebersicht');

    cy.byTestId('page-title').should('be.visible').and('have.text', 'Übersicht');
  });

  it('keeps the page title out of the accessibility tree, since the real h1 already names the page', () => {
    cy.loginDefault();
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/uebersicht');

    cy.byTestId('page-title').should('have.attr', 'aria-hidden', 'true');
  });

  it('shows the page title in the header on desktop too', () => {
    cy.loginDefault();
    cy.visit('/uebersicht');

    cy.byTestId('page-title').should('be.visible').and('have.text', 'Übersicht');
  });

});
