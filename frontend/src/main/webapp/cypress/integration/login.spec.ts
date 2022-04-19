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
    login('e2etest', 'e2etest');

    cy.url().should('contain', '/uebersicht');
  });

  it('login failed', () => {
    login('dummy', 'dummy');

    cy.url().should('contain', '/login');
    cy.byTestId('errorMessage').should('exist');
  });

  function login(username: string, password: string) {
    cy.byTestId('username').type(username);
    cy.byTestId('password').type(password);
    cy.byTestId('loginButton').click();
  }

});
