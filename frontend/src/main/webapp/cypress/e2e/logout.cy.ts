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
