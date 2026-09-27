import {MAIN_CONTENT} from '../support/accessibility';
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

  it('the email address can be set, changed and removed again', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.visit('/benutzer/detail/' + user.id);
      cy.byTestId('emailText').should('have.text', '-');

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('emailInput').should('have.value', '');
      cy.byTestId('emailInput').type('erste@example.org');
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('emailText').should('have.text', 'erste@example.org');

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('emailInput').should('have.value', 'erste@example.org');
      cy.byTestId('emailInput').clear().type('zweite@example.org');
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('emailText').should('have.text', 'zweite@example.org');

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('emailInput').clear();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('emailText').should('have.text', '-');
    });
  });

  it('personnel number and name are plain fields, filled from the account', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);

      cy.byTestId('personnelNumberInput').should('have.value', user.personnelNumber);
      cy.byTestId('lastnameInput').should('have.value', user.lastname);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);
      cy.byTestId('user-employee-search-button').should('not.exist');
      cy.byTestId('selectedEmployeeDescription').should('not.exist');
    });
  });

  it('changes the personnel number and the name of the account', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('personnelNumberInput').clear().type('changed-' + user.personnelNumber);
      cy.byTestId('lastnameInput').clear().type('Changed');
      cy.byTestId('firstnameInput').clear().type('Person');
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('personnelNumberText').should('have.text', 'changed-' + user.personnelNumber);
      cy.byTestId('nameText').should('have.text', 'Changed Person');
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
          // the address is the second factor of an administrator on the e-mail method
          cy.byTestId('emailInput').should('be.disabled');
          cy.byTestId('email-locked-hint').should('be.visible').and('contain.text', 'Administrator');

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

          cy.request({
            method: 'PUT',
            url: '/api/users/' + administrator.id,
            failOnStatusCode: false,
            body: {...administrator, email: 'hijacked@example.org'}
          }).its('status').should('eq', 403);
        });
      });
    });
  });

  /**
   * A session - an open browser, a stolen cookie - must not be able to replace its own account's password without
   * knowing the current one: the self-service route is "Mein Konto" > "Passwort", which asks for it. The editor
   * offers no reset for the own account, and the backend refuses the same change when it is sent directly.
   */
  it('offers no password reset for the own account, and refuses one sent directly', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const password = testUserPassword(randomNumber, 'own-password-');
      const manager: UserData = {
        username: 'own-password-' + randomNumber,
        personnelNumber: 'own-password-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired: false,
        permissions: [{key: 'USER_MANAGEMENT', title: 'Benutzerverwaltung'}]
      };

      cy.createUser(manager).then(response => {
        const own = response.body;

        cy.login(own.username, password);
        cy.visit('/benutzer/bearbeiten/' + own.id);

        cy.byTestId('password-reset-toggle').should('not.exist');
        cy.byTestId('password-reset-own-hint').should('be.visible');
        cy.checkAccessibility(MAIN_CONTENT);

        cy.request({
          method: 'PUT',
          url: '/api/users/' + own.id,
          failOnStatusCode: false,
          body: {...own, password: 'hijackedPassword1', passwordRepeat: 'hijackedPassword1'}
        }).its('status').should('eq', 400);

        // the password is what it was
        cy.createLoginRequest(own.username, password).its('status').should('eq', 200);

        // someone else's account keeps its reset section
        cy.loginDefault();
        cy.visit('/benutzer/bearbeiten/' + own.id);
        cy.byTestId('password-reset-toggle').should('be.visible');
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
