import {recurse} from 'cypress-recurse';

describe('PasswordChange', () => {

  beforeEach(() => {
    cy.login('e2etest2', 'e2etest');
    cy.visit('/#');
  });

  it('change password', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    const currentPassword = 'e2etest';
    recurse(
      () => cy.byTestId('currentPasswordText').type(currentPassword),
      ($input) => $input.val() === currentPassword,
    ).should('have.value', currentPassword);

    const newPassword = '4wtouCcWWqDJsP';
    recurse(
      () => cy.byTestId('newPasswordText').type(newPassword),
      ($input) => $input.val() === newPassword,
    ).should('have.value', newPassword);

    recurse(
      () => cy.byTestId('newRepeatedPasswordText').type(newPassword),
      ($input) => $input.val() === newPassword,
    ).should('have.value', newPassword);

    cy.byTestId('saveButton').click();

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('contain', '/login');

    cy.login('e2etest2', '4wtouCcWWqDJsP');
    cy.visit('/#');

    cy.url().should('contain', '/#');

    // expect error for old password
    cy.createLoginRequest('e2etest2', 'e2etest', false).then((resp) => {
      expect(resp.status).to.eq(403);
    });
  });

});
