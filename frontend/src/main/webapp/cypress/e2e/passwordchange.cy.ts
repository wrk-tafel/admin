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

  it('cancel returns to the screen the page was opened from', () => {
    cy.visit('/kunden/suchen');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    cy.url().should('contain', '/passwortaendern');

    cy.byTestId('cancelButton').click();

    cy.url().should('contain', '/kunden/suchen');
  });

  it('cancel falls back to the overview when the page was opened directly', () => {
    cy.visit('/passwortaendern');

    cy.byTestId('cancelButton').click();

    cy.url().should('contain', '/uebersicht');
  });

  it('shows a live password-rule checklist and strength meter while typing', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    // No password typed yet - nothing is met, and the strength meter doesn't render at all.
    cy.byTestId('passwordStrength').should('not.exist');
    cy.byTestId('passwordRule-0').should('contain.text', 'Noch nicht erfüllt');

    // Too short and equal to the logged-in username ("e2etest") - two rules stay unmet.
    cy.byTestId('newPasswordText').type('e2etest');
    cy.byTestId('passwordRule-0').should('contain.text', 'Noch nicht erfüllt'); // min. 8 characters
    cy.byTestId('passwordRule-1').should('contain.text', 'Noch nicht erfüllt'); // contains the username
    cy.byTestId('passwordStrength').should('be.visible');
    cy.byTestId('passwordStrengthLabel').should('not.be.empty');

    // The bar is color-coded by strength: weak renders in the severity-danger red. Asserted on the
    // computed color, not just the class, so a dead theming token (the bug this guards against -
    // the M2-only `color` input never worked under the M3 theme) fails here.
    cy.byTestId('passwordStrengthBar').should('have.class', 'progress-bar-danger')
      .find('.mdc-linear-progress__bar-inner').first()
      .should('have.css', 'border-top-color', 'rgb(198, 40, 40)');

    // A medium-strength password turns the bar to the warning amber.
    cy.byTestId('newPasswordText').find('input').clear().type('passwort123');
    cy.byTestId('passwordStrengthLabel').should('have.text', 'Mittel');
    cy.byTestId('passwordStrengthBar').should('have.class', 'progress-bar-warning')
      .find('.mdc-linear-progress__bar-inner').first()
      .should('have.css', 'border-top-color', 'rgb(180, 83, 9)');

    // A password meeting every client-checkable rule turns the whole checklist green.
    cy.byTestId('newPasswordText').find('input').clear().type('dummy-Passwort-42');
    cy.byTestId('passwordRule-0').should('contain.text', 'Erfüllt:');
    cy.byTestId('passwordRule-1').should('contain.text', 'Erfüllt:');
    cy.byTestId('passwordRule-2').should('contain.text', 'Erfüllt:');
    cy.byTestId('passwordRule-3').should('contain.text', 'Erfüllt:');

    // ... and the bar to the success green.
    cy.byTestId('passwordStrengthLabel').should('have.text', 'Stark');
    cy.byTestId('passwordStrengthBar').should('have.class', 'progress-bar-success')
      .find('.mdc-linear-progress__bar-inner').first()
      .should('have.css', 'border-top-color', 'rgb(21, 128, 61)');

    // A banned word keeps its own rule unmet even though the password is otherwise fine.
    cy.byTestId('newPasswordText').find('input').clear().type('tafelverein99');
    cy.byTestId('passwordRule-0').should('contain.text', 'Erfüllt:');
    cy.byTestId('passwordRule-3').should('contain.text', 'Noch nicht erfüllt');
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
      cy.byTestId('cancelButton').should('exist');
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

        // The session survives the change: the user is taken back to the screen they came from and
        // the toast is what says so - the form itself is gone by then.
        cy.url().should('contain', '/uebersicht');
        cy.get('.toast-message').should('be.visible')
          .and('contain.text', 'Sie bleiben mit dem neuen Passwort angemeldet.');
        // Dismissed explicitly: the toast sits in the top right corner, over the user menu the rest
        // of this test needs to click.
        cy.get('.tafel-snackbar-close').click();

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
