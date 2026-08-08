import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {testUserPassword, UserData} from '../support/commands';

describe('User Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('shows permissions grouped by category', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const generatedPassword = testUserPassword(randomNumber);
      const userData: UserData = {
        username: 'permcheck-' + randomNumber,
        personnelNumber: 'permcheck-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: generatedPassword,
        passwordRepeat: generatedPassword,
        passwordChangeRequired: false,
        permissions: [
          {key: 'CHECKIN', title: 'Anmeldung'},
          {key: 'SUPERVISOR', title: 'Supervisor'}
        ]
      };

      cy.createUser(userData).then(response => {
        cy.visit('/benutzer/detail/' + response.body.id);

        cy.byTestId('permission-group-Ausgabe & Betrieb').within(() => {
          cy.byTestId('permission-chip-CHECKIN').should('contain.text', 'Anmeldung');
        });
        cy.byTestId('permission-group-Leitung').within(() => {
          cy.byTestId('permission-chip-SUPERVISOR').should('contain.text', 'Supervisor');
        });
      });
    });
  });

  it('shows a placeholder when the user has no permissions', () => {
    cy.createDummyUser().then(response => {
      cy.visit('/benutzer/detail/' + response.body.id);

      cy.byTestId('permissionsText').should('contain.text', '-');
    });
  });

  it('userId correct', () => {
    cy.visit('/benutzer/detail/300');
    cy.byTestId('usernameText').should('have.text', 'admin');
  });

  it('disable and re-enable user', () => {
    cy.visit('/benutzer/detail/300');

    cy.byTestId('enabledText').should('have.text', 'Ja');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('disableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Nein');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('enableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Ja');
  });

  it('edit user', () => {
    cy.visit('/benutzer/detail/100');

    cy.byTestId('editUserButton').click();

    cy.url().should('include', '/benutzer/bearbeiten/100');
  });

  it('delete user', () => {
    cy.createDummyUser().then(response => {
      const userId = response.body.id;

      cy.visit('/benutzer/detail/' + userId);

      cy.byTestId('changeUserStateButton').click();
      cy.byTestId('deleteUserButton').click();

      cy.url().should('include', '/benutzer/suchen');

      // re-fetching the now-deleted user 404s, and the app's global navigation-error handler
      // routes that to the 404 page rather than leaving a blank shell
      cy.visit('/benutzer/detail/' + userId);
      cy.url().should('include', '/404');
    });
  });

  it('disable and re-enable user on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/benutzer/detail/300');

    // action buttons and the details card stack (flex-col-reverse, buttons below the card) below the
    // lg: breakpoint - on the short phone viewport the now-richer permissions section pushes the
    // buttons past the fold, so scroll to them first like a real user would.
    cy.byTestId('editUserButton').scrollIntoView().should('be.visible');
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
    cy.visit('/benutzer/detail/300');

    cy.byTestId('usernameText').should('have.text', 'admin');
    cy.byTestId('editUserButton').should('be.visible');
    cy.byTestId('changeUserStateButton').should('be.visible');
  });

});
