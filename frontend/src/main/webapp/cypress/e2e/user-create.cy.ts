describe('User Create', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('create new user', () => {
    cy.visit('/#/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      const username = 'test-username-' + userRandomId;
      cy.byTestId('usernameInput').type(username);
      const personnelNumber = 'test-personnelNumber-' + userRandomId;
      cy.byTestId('personnelNumberInput').type(personnelNumber);
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');
      cy.byTestId('generate-password-button').click();

      cy.byTestId('passwordChangeRequiredInput').click();

      cy.byTestId('permission-checkbox-0').click();

      cy.byTestId('permission-checkbox-2').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', `/benutzer/detail`);
      cy.byTestId('usernameText').should('have.text', username);
      cy.byTestId('personnelNumberText').should('have.text', personnelNumber);
    });
  });

  it('create new user which exists already', () => {
    cy.visit('/#/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('e2etest');
      cy.byTestId('personnelNumberInput').type('e2etest');
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');
      cy.byTestId('generate-password-button').click();

      cy.byTestId('passwordChangeRequiredInput').click();

      cy.byTestId('permission-checkbox-0').click();

      cy.byTestId('permission-checkbox-2').click();
      cy.byTestId('save-button').click();

      cy.byTestId('tafel-toast-body')
        .should('be.visible')
        .within(() => {
          cy.byTestId('message').should('have.text', 'Benutzer (Benutzername: e2etest) existiert bereits!');
        });
    });
  });

});
