describe('Customer Above Limit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a customer whose income exceeds the limit and links to their detail page', () => {
    cy.createDummyCustomer(50000, true).then((response) => {
      const customer = response.body.data;

      cy.visit('/#/kunden/ueber-limit');

      cy.contains('[testid^="abovelimit-id-"]', customer.id!.toString())
        .closest('tr')
        .within(() => {
          cy.get('[testid^="abovelimit-name-"]').should('contain.text', customer.lastname).and('contain.text', customer.firstname);
          cy.get('[testid^="abovelimit-address-"]').should('contain.text', customer.address.city);
          cy.get('[testid^="abovelimit-totalSum-"]').should('be.visible');
          cy.get('[testid^="abovelimit-limit-"]').should('be.visible');
          cy.get('[testid^="abovelimit-amountExceededLimit-"]')
            .should('be.visible')
            .invoke('text')
            .should('not.be.empty');

          cy.get('[testid^="abovelimit-showcustomer-button-"]').click();
        });

      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

});
