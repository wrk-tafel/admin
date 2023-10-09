describe('User Create', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('create new user', () => {
    cy.visit('/#/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      cy.byTestId('personnelNumberInput').type('test-personnelNumber-' + userRandomId);
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');

      cy.byTestId('generate-password-button').click();

      cy.byTestId('passwordChangeRequiredInput').click();

      cy.byTestId('permission-checkbox-0').click();
      cy.byTestId('permission-checkbox-2').click();

      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
    });
  });

});
