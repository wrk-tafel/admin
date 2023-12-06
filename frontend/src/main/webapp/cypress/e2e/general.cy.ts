describe('General', () => {

  beforeEach(() => {
    cy.visit('/#/');
  });

  it('window title correct', () => {
    cy.contains('Tafel Admin');
  });

  it('redirects per default to login', () => {
    cy.url().should('include', '/login');
  });

  it('status 404 page visible', () => {
    cy.visit('/#/invalidpath');

    cy.byTestId('status').should('have.text', '404');
    cy.byTestId('title').should('have.text', 'Seite nicht gefunden');
    cy.byTestId('subtitle').should('have.text', 'Diese Bananenkiste ist wohl leer');

    cy.url().should('include', '/invalidpath');
  });

  it('status 500 page visible', () => {
    cy.visit('/#/500');

    cy.byTestId('status').should('have.text', '500');
    cy.byTestId('title').should('have.text', 'Houston, wir haben ein Problem!');
    cy.byTestId('subtitle').should('have.text', 'Interner Server Fehler');

    cy.url().should('include', '/500');
  });

});
