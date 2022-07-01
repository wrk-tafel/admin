describe('General', () => {

  beforeEach(() => {
    cy.visit('/#/');
  });

  it('window title correct', () => {
    cy.contains('Tafel Admin');
  });

  it('redirects per default to login', () => {
    cy.url().should('include', '/login')
  });

});
