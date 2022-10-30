describe('PasswordChange', () => {

  beforeEach(() => {
    cy.login('e2etest2', 'e2etest');
    cy.visit('/#');
  });

  it('change password', () => {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    cy.byTestId('currentPasswordText').type('e2etest')
      .then(() => cy.byTestId('newPasswordText').type('4wtouCcWWqDJsP'))
      .then(() => cy.byTestId('newRepeatedPasswordText').type('4wtouCcWWqDJsP'))
      .then(() => cy.byTestId('saveButton').click());

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
