import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('General', () => {

  beforeEach(() => {
    cy.visit('/#/');
  });

  it('window title correct', () => {
    cy.contains('Tafel Admin');
  });

  it('redirects per default to login', () => {
    cy.url().should('include', '/login');
  });

  it('status 404 page visible', () => {
    cy.visit('/#/invalidpath');

    cy.byTestId('status').should('have.text', '404');
    cy.byTestId('title').should('have.text', 'Seite nicht gefunden');
    cy.byTestId('subtitle').should('have.text', 'Diese Bananenkiste ist wohl leer');

    cy.url().should('include', '/invalidpath');
  });

  it('status 500 page visible', () => {
    cy.visit('/#/500');

    cy.byTestId('status').should('have.text', '500');
    cy.byTestId('title').should('have.text', 'Houston, wir haben ein Problem!');
    cy.byTestId('subtitle').should('have.text', 'Interner Server Fehler');

    cy.url().should('include', '/500');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/#/invalidpath');

      cy.byTestId('status').should('be.visible').and('have.text', '404');
      cy.byTestId('title').should('be.visible').and('have.text', 'Seite nicht gefunden');
    });
  });

});

describe('Navigation Progress Bar', () => {

  it('shows a top-level loading bar while a resolver-gated page is loading, and hides it once loaded', () => {
    cy.loginDefault();
    cy.visit('/#/uebersicht');

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
    cy.contains('Kunden über Limit').click();

    cy.byTestId('nav-progress-bar').should('be.visible');

    cy.wait('@aboveLimit');

    cy.byTestId('nav-progress-bar').should('not.exist');
    cy.url().should('include', '/kunden/ueber-limit');
  });

});
