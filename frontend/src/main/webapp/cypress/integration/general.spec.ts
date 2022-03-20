describe('Admin', () => {

  beforeEach(() => {
    cy.visit('/');
  });

  it('window title correct', () => {
    cy.contains('Tafel Admin');
  });

});
