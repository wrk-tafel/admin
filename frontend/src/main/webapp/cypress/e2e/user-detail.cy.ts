import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('userId correct', () => {
    cy.visit('/#/benutzer/detail/300');
    cy.byTestId('usernameText').should('have.text', 'admin');
  });

  it('disable and re-enable user', () => {
    cy.visit('/#/benutzer/detail/300');

    cy.byTestId('enabledText').should('have.text', 'Ja');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('disableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Nein');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('enableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Ja');
  });

  it('edit user', () => {
    cy.visit('/#/benutzer/detail/100');

    cy.byTestId('editUserButton').click();

    cy.url().should('include', '/benutzer/bearbeiten/100');
  });

  it('delete user', () => {
    cy.createDummyUser().then(response => {
      const userId = response.body.id;

      cy.visit('/#/benutzer/detail/' + userId);

      cy.byTestId('changeUserStateButton').click();
      cy.byTestId('deleteUserButton').click();

      cy.url().should('include', '/benutzer/suchen');

      // delete fails, UI stays on user-search and shows toast
      cy.visit('/#/benutzer/detail/' + userId);
      cy.url().should('include', '/benutzer/suchen');
    });
  });

  it('disable and re-enable user on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/#/benutzer/detail/300');

    // action buttons and the details card stack (flex-col, buttons on top) below the lg: breakpoint
    cy.byTestId('editUserButton').should('be.visible');
    cy.byTestId('enabledText').should('have.text', 'Ja');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('disableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Nein');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('enableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Ja');
  });

  it('shows the stacked action/details layout at tablet width', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/#/benutzer/detail/300');

    cy.byTestId('usernameText').should('have.text', 'admin');
    cy.byTestId('editUserButton').should('be.visible');
    cy.byTestId('changeUserStateButton').should('be.visible');
  });

});
