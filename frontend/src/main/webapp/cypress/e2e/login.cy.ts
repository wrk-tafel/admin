describe('Login', () => {

  beforeEach(() => {
    cy.visit('/#/login');
  });

  it('login button disabled by default', () => {
    cy.byTestId('loginButton').should('be.disabled');
  });

  it('errorMessage hidden by default', () => {
    cy.byTestId('errorMessage').should('not.exist');
  });

  it('login successful', () => {
    enterLoginData('e2etest', 'e2etest');

    cy.url().should('contain', '/uebersicht');
  });

  it('login failed', () => {
    enterLoginData('dummy', 'dummy');

    cy.url().should('contain', '/login');
    cy.byTestId('errorMessage').should('exist');
  });

  it('login with required password change cannot access the dashboard', () => {
    enterLoginData('e2etest3', 'e2etest');
    cy.url().should('contain', '/login/passwortaendern');

    cy.visit('/#/uebersicht');
    cy.url().should('contain', '/login');
    cy.byTestId('errorMessage').should('exist');
  });

  it('login with required password change cancelled', () => {
    enterLoginData('e2etest3', 'e2etest');

    cy.url().should('contain', '/login/passwortaendern');
    cy.byTestId('cancelButton').click();
    cy.url().should('contain', '/login');
  });

  it('login with required password change and password changed', () => {
    enterLoginData('e2etest3', 'e2etest');
    cy.url().should('contain', '/login/passwortaendern');

    cy.byTestId('currentPasswordText').type('e2etest');
    cy.byTestId('newPasswordText').type('11111111');
    cy.byTestId('newRepeatedPasswordText').type('11111111');

    cy.byTestId('saveButton').click();
    cy.url().should('contain', '/uebersicht');
  });

  function enterLoginData(username: string, password: string) {
    cy.byTestId('username').type(username);
    cy.byTestId('password').type(password);
    cy.byTestId('loginButton').click();
  }

});
