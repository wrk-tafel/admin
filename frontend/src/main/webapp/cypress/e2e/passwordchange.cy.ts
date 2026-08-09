import {recurse} from 'cypress-recurse';
import {testUserPassword, UserData} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('PasswordChange', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/');
  });

  it('password mismatch validation', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    // Enter current password
    cy.byTestId('currentPasswordText').type('e2etest');

    // Enter new password
    const newPassword = 'NewPassword123';
    cy.byTestId('newPasswordText').type(newPassword);

    // Enter different repeated password (mismatch)
    const mismatchPassword = 'DifferentPassword123';
    cy.byTestId('newRepeatedPasswordText').type(mismatchPassword);

    // Blur the field to trigger validation
    cy.byTestId('newRepeatedPasswordText').find('input').blur();

    // Verify the mismatch error message is shown
    cy.contains('Passwort-Wiederholung stimmt nicht überein!').should('be.visible');

    // Verify the newRepeatedPassword field shows error message
    cy.byTestId('newRepeatedPasswordText-error').should('have.text', 'Passwort-Wiederholung stimmt nicht überein!');

    // Verify save button is disabled (if there's a save button in the component)
    cy.byTestId('saveButton').should('be.disabled');

    // Now fix the password to match
    cy.byTestId('newRepeatedPasswordText').find('input').clear().type(newPassword);
    cy.byTestId('newRepeatedPasswordText').find('input').blur();

    // Verify the error message is gone
    cy.byTestId('newRepeatedPasswordText-error').should('not.exist');
  });

  /**
   * The password rules are per-installation configuration (`tafeladmin.password`) that reaches the
   * frontend through /api/config, so the screen has to state and validate against whatever this
   * deployment is configured with - including after an operator edits it while the page is open,
   * which is why nothing here is stubbed: the edit goes into the real config file the backend
   * re-reads and pushes over SSE.
   */
  it('states and enforces the password rules the backend is configured with', () => {
    cy.task('clearBackendConfig');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    cy.byTestId('passwordRules').should('contain.text', 'Mindestens 8 Zeichen, maximal 50 Zeichen');
    cy.byTestId('passwordRules').should('contain.text', 'Folgende Wörter sind nicht erlaubt: wrk');
    cy.byTestId('passwordRules').should('not.contain.text', 'Ziffer');

    const tightenedRules = [
      'tafeladmin:',
      '  password:',
      '    minLength: 12',
      '    characters:',
      '      minDigits: 2',
      '    dictionary:',
      '      forbiddenWords: []'
    ].join('\n');
    cy.task('writeBackendConfig', tightenedRules);

    cy.byTestId('passwordRules', {timeout: 20000}).should('contain.text', 'Mindestens 12 Zeichen, maximal 50 Zeichen');
    // a rule switched on in the config appears in the list without the frontend knowing it exists
    cy.byTestId('passwordRules').should('contain.text', 'Mindestens 2 Ziffern');
    // an installation with no forbidden words configured doesn't state that rule at all
    cy.byTestId('passwordRules').should('not.contain.text', 'Folgende Wörter sind nicht erlaubt');

    // the form validates against the new minimum, not the one the page was loaded with
    cy.byTestId('currentPasswordText').type('e2etest');
    cy.byTestId('newPasswordText').type('TenChars12');
    cy.byTestId('newPasswordText').find('input').blur();
    cy.contains('Passwort zu kurz (Limit: 12)').should('be.visible');

    cy.task('clearBackendConfig');
    cy.byTestId('passwordRules', {timeout: 20000}).should('contain.text', 'Mindestens 8 Zeichen, maximal 50 Zeichen');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('usermenu').click();
      cy.byTestId('usermenu-changepassword').click();

      cy.byTestId('currentPasswordText').should('be.visible');
      cy.byTestId('newPasswordText').should('be.visible');
      cy.byTestId('newRepeatedPasswordText').should('be.visible');
      cy.byTestId('saveButton').should('exist');
    });
  });

  it('change password', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const generatedPassword = testUserPassword(randomNumber);
      const testUser: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: 'personnelnumber-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: generatedPassword,
        passwordRepeat: generatedPassword,
        passwordChangeRequired: false,
        // Needs at least one permission to pass the dashboard's anyPermission guard - the cy.visit
        // below is a real page reload (not just an in-app navigation), so the guard genuinely runs
        // for this freshly-logged-in user rather than reusing an already-authenticated session.
        permissions: [{key: 'CHECKIN', title: 'Anmeldung'}]
      };

      cy.createUser(testUser).then(response => {
        const user = response.body;

        cy.login(user.username, testUser.password!);
        cy.visit('/');

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-changepassword').click();

        const currentPassword = testUser.password!;
        recurse(
          () => cy.byTestId('currentPasswordText').find('input').type(currentPassword),
          ($input) => $input.val() === currentPassword,
          {timeout: 30000}
        ).should('have.value', currentPassword);

        const newPassword = '4wtouCcWWqDJsP';
        recurse(
          () => cy.byTestId('newPasswordText').find('input').type(newPassword),
          ($input) => $input.val() === newPassword,
          {timeout: 30000}
        ).should('have.value', newPassword);

        recurse(
          () => cy.byTestId('newRepeatedPasswordText').find('input').type(newPassword),
          ($input) => $input.val() === newPassword,
          {timeout: 30000}
        ).should('have.value', newPassword);

        // Intercept the password change request
        cy.intercept('POST', '/api/users/change-password').as('changePassword');

        cy.byTestId('saveButton').click();

        // Wait for the password change to complete
        cy.wait('@changePassword').its('response.statusCode').should('eq', 200);

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-logout').click();

        cy.url().should('contain', '/login');

        cy.login(user.username, '4wtouCcWWqDJsP');
        cy.visit('/');

        cy.url().should('contain', '/uebersicht');

        // expect error for invalid password
        cy.createLoginRequest(user.username, currentPassword, false).then((resp) => {
          expect(resp.status).to.eq(403);
        });
      });
    });
  });

});
