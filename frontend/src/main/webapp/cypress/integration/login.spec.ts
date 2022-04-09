describe('Login', () => {

  it('login successful', () => {
    cy.visit('/');
    cy.url().should('contain', '/login');
    cy.get('[testid=errorMessage]').should('not.exist');

    cy.loginWithTestuser();
    cy.visit('/');

    cy.url().should('contain', '/uebersicht');
  });

  it('login failed', () => {
    cy.visit('/');
    cy.url().should('contain', '/login');
    cy.get('[testid=errorMessage]').should('not.exist');

    cy.login('dummy', 'dummy');

    cy.url().should('contain', '/login');
    cy.get('[testid=errorMessage]').should('exist');
  });

});
