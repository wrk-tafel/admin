import {recurse} from 'cypress-recurse';
import {UserData} from '../support/commands';

describe('PasswordChange', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#');
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

        cy.intercept('POST', '/api/users/change-password').as('changePassword');
        cy.byTestId('saveButton').click();
        cy.wait('@changePassword');

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-logout').click();

        cy.url().should('contain', '/login');

        cy.login(user.username, '4wtouCcWWqDJsP');
        cy.visit('/#');

        cy.url().should('contain', '/#');

        // expect error for old password
        cy.createLoginRequest(user.username, testUser.password, false).then((resp) => {
          expect(resp.status).to.eq(403);
        });
      });
    });
  });

});
