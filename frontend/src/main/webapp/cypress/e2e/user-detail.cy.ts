describe('User Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('userId correct', () => {
    cy.visit('/#/benutzer/detail/300');
    cy.byTestId('usernameText').should('have.text', 'admin');
  });

});
