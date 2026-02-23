import {recurse} from 'cypress-recurse';
import {UserData} from '../support/commands';

describe('PasswordChange', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#');
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
    cy.byTestId('newRepeatedPasswordText').blur();

    // Verify the mismatch error message is shown
    cy.contains('Passwort-Wiederholung stimmt nicht überein!').should('be.visible');

    // Verify the newRepeatedPassword field has the invalid class
    cy.byTestId('newRepeatedPasswordText').should('have.class', 'is-invalid');

    // Verify save button is disabled (if there's a save button in the component)
    cy.byTestId('saveButton').should('be.disabled');

    // Now fix the password to match
    cy.byTestId('newRepeatedPasswordText').clear().type(newPassword);
    cy.byTestId('newRepeatedPasswordText').blur();

    // Verify the error message is gone
    cy.contains('Passwort-Wiederholung stimmt nicht überein!').should('not.exist');

    // Verify the field is now valid
    cy.byTestId('newRepeatedPasswordText').should('have.class', 'is-valid');
  });

  it('change password', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const testUser: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: 'personnelnumber-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: 'dummy-' + randomNumber,
        passwordRepeat: 'dummy-' + randomNumber,
        passwordChangeRequired: false,
        permissions: []
      };

      cy.createUser(testUser).then(response => {
        const user = response.body;

        cy.login(user.username, testUser.password);
        cy.visit('/#');

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-changepassword').click();

        const currentPassword = testUser.password;
        recurse(
          () => cy.byTestId('currentPasswordText').type(currentPassword),
          ($input) => $input.val() === currentPassword,
          {timeout: 30000}
        ).should('have.value', currentPassword);

        const newPassword = '4wtouCcWWqDJsP';
        recurse(
          () => cy.byTestId('newPasswordText').type(newPassword),
          ($input) => $input.val() === newPassword,
          {timeout: 30000}
        ).should('have.value', newPassword);

        recurse(
          () => cy.byTestId('newRepeatedPasswordText').type(newPassword),
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
        cy.visit('/#');

        cy.url().should('contain', '/#');

        // expect error for invalid password
        cy.createLoginRequest(user.username, currentPassword, false).then((resp) => {
          expect(resp.status).to.eq(403);
        });
      });
    });
  });

});
