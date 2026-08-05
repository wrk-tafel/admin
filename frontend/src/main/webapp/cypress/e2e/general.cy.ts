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

  it('status 404 page visible', () => {
    cy.visit('/invalidpath');

    cy.byTestId('status').should('have.text', '404');
    cy.byTestId('title').should('have.text', 'Seite nicht gefunden');
    cy.byTestId('subtitle').should('have.text', 'Diese Bananenkiste ist wohl leer');

    cy.url().should('include', '/invalidpath');
  });

  it('status 500 page visible', () => {
    cy.visit('/500');

    cy.byTestId('status').should('have.text', '500');
    cy.byTestId('title').should('have.text', 'Houston, wir haben ein Problem!');
    cy.byTestId('subtitle').should('have.text', 'Interner Server Fehler');

    cy.url().should('include', '/500');
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
    // "Kunden über Limit" lives under the collapsible "Sonstige" nav group - expand it first
    // (the `a` selector disambiguates from the unrelated "Sonstige" section title lower in the nav)
    cy.contains('a', 'Sonstige').click();
    cy.contains('Kunden über Limit').click();

    cy.byTestId('nav-progress-bar').should('be.visible');

    cy.wait('@aboveLimit');

    cy.byTestId('nav-progress-bar').should('not.exist');
    cy.url().should('include', '/kunden/ueber-limit');
  });

});
