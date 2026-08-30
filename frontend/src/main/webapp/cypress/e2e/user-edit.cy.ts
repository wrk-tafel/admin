import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {testUserPassword, UserData} from '../support/commands';

describe('User Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('edit user', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.visit('/benutzer/detail/' + user.id);
      cy.byTestId('permissionsText').should('not.contain.text', 'Anmeldung');

      cy.visit('/benutzer/bearbeiten/' + user.id);

      // Wait for form to be fully loaded with user data
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('firstnameInput').click();
      cy.byTestId('firstnameInput').clear();
      cy.byTestId('firstnameInput').type(`${user.firstname} updated`);

      cy.byTestId('permission-checkbox-CHECKIN').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);

      cy.byTestId('permissionsText').should('contain.text', 'Anmeldung');
      cy.byTestId('nameText').should('contain.text', 'updated');
    });
  });

  it('the employee already linked to the account is resolved on load', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);

      cy.byTestId('personnelNumberInput').should('not.exist');
      cy.byTestId('selectedEmployeeDescription')
        .should('have.text', `${user.personnelNumber} ${user.firstname} ${user.lastname}`);
    });
  });

  it('password fields sit behind a collapsed reset section, and leaving it closed keeps the password', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('password-reset-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false');
      cy.byTestId('passwordInput').should('not.be.visible');

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('password-reset-toggle').should('have.attr', 'aria-expanded', 'true');
      cy.byTestId('passwordInput').should('be.visible');
      cy.byTestId('password-rules').should('be.visible');

      // leaving the revealed fields empty and saving must not touch the existing password
      cy.intercept('PUT', '/api/users/*').as('updateUser');
      cy.byTestId('save-button').click();

      cy.wait('@updateUser').then((interception) => {
        expect(interception.request.body.password).to.eq(undefined);
        expect(interception.request.body.passwordRepeat).to.eq(undefined);
      });
      cy.url().should('contain', '/benutzer/detail/' + user.id);
    });
  });

  // Regression test for #3563: a mismatching password typed and then collapsed used to leave
  // "Speichern" disabled with the mismatch error hidden inside the now-collapsed section.
  it('collapsing the reset section clears a mismatching password so "Speichern" stays enabled', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('passwordInput').should('be.visible').type('abc');
      cy.byTestId('passwordRepeatInput').type('abd');
      cy.byTestId('save-button').should('be.disabled');

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('passwordInput').should('not.be.visible');
      cy.byTestId('save-button').should('not.be.disabled');

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('passwordInput').should('be.visible').should('have.value', '');
      cy.byTestId('passwordRepeatInput').should('have.value', '');
    });
  });

  it('typing a password and collapsing the reset section again before saving does not reset it', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('passwordInput').should('be.visible').type('aNewSecretPassword1');
      cy.byTestId('passwordRepeatInput').type('aNewSecretPassword1');

      // collapsed again without clearing what was typed - the save that follows must still treat
      // this as "leave the password unchanged", not send the now-hidden value. See #3530.
      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('passwordInput').should('not.be.visible');

      cy.intercept('PUT', '/api/users/*').as('updateUser');
      cy.byTestId('save-button').click();

      cy.wait('@updateUser').then((interception) => {
        expect(interception.request.body.password).to.eq(undefined);
        expect(interception.request.body.passwordRepeat).to.eq(undefined);
      });
      cy.url().should('contain', '/benutzer/detail/' + user.id);
    });
  });

  it('warns before leaving the page with unsaved changes', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);
      cy.byTestId('firstnameInput').clear().type('changed');

      // an in-app navigation is what the CanDeactivate guard actually sees - a full page load
      // bypasses Angular's router entirely
      cy.get('a[routerLink="/uebersicht"]').first().click();

      cy.byTestId('unsavedchanges-dialog').should('be.visible');
      cy.url().should('contain', '/benutzer/bearbeiten/' + user.id);

      // cancelling keeps the edit and stays on the form
      cy.byTestId('cancelButton').click();
      cy.byTestId('unsavedchanges-dialog').should('not.exist');
      cy.byTestId('firstnameInput').should('have.value', 'changed');

      // confirming actually leaves, discarding the change
      cy.get('a[routerLink="/uebersicht"]').first().click();
      cy.byTestId('okButton').click();
      cy.url().should('contain', '/uebersicht');
    });
  });

  it('does not warn again right after a successful save', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);
      cy.byTestId('firstnameInput').clear().type('changed-and-saved');

      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('unsavedchanges-dialog').should('not.exist');
    });
  });

  /**
   * Issue #3566: a USER_MANAGEMENT-only caller could otherwise reset an administrator's password
   * or username (or force a password change) without ever touching the ADMINISTRATOR checkbox
   * itself. Covers both the UI lock and the backend refusing the same change directly, since the
   * lock is only the first line of defense.
   */
  it('locks username, password reset and forced-password-change on an administrator account for a non-administrator', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const adminPassword = testUserPassword(randomNumber, 'escalation-admin-');
      const administratorUser: UserData = {
        username: 'escalation-admin-' + randomNumber,
        personnelNumber: 'escalation-admin-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: adminPassword,
        passwordRepeat: adminPassword,
        passwordChangeRequired: false,
        permissions: [{key: 'ADMINISTRATOR', title: 'Administrator'}]
      };

      cy.createUser(administratorUser).then(adminResponse => {
        const administrator = adminResponse.body;

        const managerPassword = testUserPassword(randomNumber, 'escalation-manager-');
        const userManager: UserData = {
          username: 'escalation-manager-' + randomNumber,
          personnelNumber: 'escalation-manager-' + randomNumber,
          firstname: 'firstname-' + randomNumber,
          lastname: 'lastname-' + randomNumber,
          enabled: true,
          password: managerPassword,
          passwordRepeat: managerPassword,
          passwordChangeRequired: false,
          permissions: [{key: 'USER_MANAGEMENT', title: 'Benutzerverwaltung'}]
        };

        cy.createUser(userManager).then(managerResponse => {
          const manager = managerResponse.body;

          cy.login(manager.username, managerPassword);
          cy.visit('/benutzer/bearbeiten/' + administrator.id);

          cy.byTestId('usernameInput').should('be.disabled');
          cy.byTestId('password-reset-toggle').should('not.exist');
          cy.byTestId('password-reset-locked-hint').should('be.visible');
          cy.byTestId('passwordChangeRequiredInput').find('input').should('be.disabled');

          // the UI lock is only the first line of defense - the backend has to refuse the same
          // change even when it's attempted directly
          cy.request({
            method: 'PUT',
            url: '/api/users/' + administrator.id,
            failOnStatusCode: false,
            body: {
              ...administrator,
              password: 'hijackedPassword1',
              passwordRepeat: 'hijackedPassword1'
            }
          }).its('status').should('eq', 403);
        });
      });
    });
  });

  it('remains usable on mobile viewports', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
        cy.viewport(viewport);
        cy.visit('/benutzer/bearbeiten/' + user.id);

        cy.byTestId('firstnameInput').should('be.visible').and('have.value', user.firstname);
        cy.byTestId('save-button').should('exist');
      });
    });
  });

});
