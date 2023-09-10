describe('User Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('userId correct', () => {
    cy.visit('/#/benutzer/detail/300');
    cy.byTestId('usernameText').should('have.text', 'admin');
  });

  it('disable and re-enable user', () => {
    cy.visit('/#/benutzer/detail/300');

    cy.byTestId('enabledText').should('have.text', 'Ja');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('disableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Nein');

    cy.byTestId('changeUserStateButton').click();
    cy.byTestId('enableUserButton').click();

    cy.byTestId('enabledText').should('have.text', 'Ja');
  });

});
