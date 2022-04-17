describe('Customer', () => {

  beforeEach(() => {
    cy.loginHeadlessWithTestuser();
    cy.visit('/');
  });

  it('create customer', () => {
    cy.visit('/kunden/anlegen');
  });

});
