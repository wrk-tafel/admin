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

      cy.intercept('POST', '/api/users').as('createUser');
      cy.byTestId('save-button').click();
      cy.wait('@createUser');

      cy.url().should('contain', `/benutzer/detail`);
      cy.byTestId('usernameText').should('have.text', username);
      cy.byTestId('personnelNumberText').should('have.text', personnelNumber);
    });
  });

  it('create new user that already exists', () => {
    cy.visit('/#/benutzer/erstellen');

    // 1. Intercept the POST request that returns the 400 error
    // Replace '/api/users' with the actual endpoint URL your app uses
    cy.intercept('POST', '/api/users').as('createUserRequest');
    // 1. Suppress uncaught exceptions just for this test
    cy.once('uncaught:exception', (err) => {
      return !err.message.includes('400');
    });

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('e2etest');
      cy.byTestId('personnelNumberInput').type('e2etest');
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');
      cy.byTestId('generate-password-button').click();
      cy.byTestId('passwordChangeRequiredInput').click();
      cy.byTestId('permission-checkbox-0').click();
      cy.byTestId('permission-checkbox-2').click();

      // 2. Click save - Cypress will no longer fail on the 400 error
      // because we are managing the request via intercept
      cy.byTestId('save-button').click();

      // 3. Wait for the request and verify the status (optional but recommended)
      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 400);

      // 4. Assert the UI feedback
      cy.byTestId('tafel-toast-body')
        .should('be.visible')
        .within(() => {
          cy.byTestId('message').should('have.text', 'Benutzer (Benutzername: e2etest) existiert bereits!');
        });
    });
  });

});
