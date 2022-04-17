describe('Customer', () => {

  beforeEach(() => {
    cy.loginWithTestuser();
    cy.visit('/');
  });

  it('create customer', () => {
    cy.visit('/kunden/anlegen');
  });

});
