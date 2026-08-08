import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Logout', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#');
  });

  it('logout working as expected', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

  it('keeps the current page fully rendered until the redirect happens', () => {
    // The cached user info backs every permission check on screen, so it must not be dropped
    // while the logout request is still running - the page the user is looking at would visibly
    // lose its permission-gated panels and menu entries first, and only then navigate away.
    cy.intercept('POST', '/api/users/logout', req => {
      req.on('response', res => {
        res.setDelay(1000);
      });
    }).as('logoutRequest');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.byTestId('distribution-state-text').should('be.visible');
    cy.url().should('not.include', '/login');

    cy.wait('@logoutRequest');
    cy.url().should('include', '/login');
  });

  it('remains usable on a phone viewport', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/#');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

  it('remains usable on a tablet viewport', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/#');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('include', '/login');
  });

});
