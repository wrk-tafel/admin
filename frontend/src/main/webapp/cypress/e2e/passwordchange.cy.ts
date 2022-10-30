import {recurse} from "cypress-recurse";

describe('PasswordChange', () => {

  beforeEach(() => {
    cy.login('e2etest2', 'e2etest');
    cy.visit('/#');
  });

  it('change password', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    cy.byTestId('currentPasswordText').type('e2etest');

    const newPassword = '4wtouCcWWqDJsP';
    recurse(
      // the commands to repeat, and they yield the input element
      () => cy.byTestId('newPasswordText').type(newPassword),
      // the predicate takes the output of the above commands
      // and returns a boolean. If it returns true, the recursion stops
      ($input) => $input.val() === newPassword,
    )
      // the recursion yields whatever the command function yields
      // and we can confirm that the text was entered correctly
      .should('have.value', newPassword);

    cy.byTestId('newRepeatedPasswordText').type('4wtouCcWWqDJsP');

    cy.byTestId('saveButton').click();

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();

    cy.url().should('contain', '/login');

    cy.login('e2etest2', '4wtouCcWWqDJsP');
    cy.visit('/#');

    cy.url().should('contain', '/#');

    // expect error for old password
    cy.createLoginRequest('e2etest2', 'e2etest', false).then((resp) => {
      expect(resp.status).to.eq(403)
    });
  });

});
