describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('customer updated', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      cy.intercept('POST', '/api/customers/validate').as('validateCustomer');
      cy.byTestId('validate-button').click();
      cy.wait('@validateCustomer');

      cy.byTestId('validationresult-modal')
        .should('have.class', 'show')
        .within(() => {
          cy.byTestId('ok-button').should('be.visible').click();
        });

      cy.intercept('POST', '/api/customers/' + customerId).as('updateCustomer');
      cy.byTestId('save-button').click();
      cy.wait('@updateCustomer');

      cy.url().should('contain', '/kunden/detail/' + customerId);
    });
  });

  it('customer invalid but still updatable', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      cy.byTestId('incomeInput').clear();
      cy.byTestId('incomeInput').type('10000');

      cy.intercept('POST', '/api/customers/validate').as('validateCustomer');
      cy.byTestId('validate-button').click();
      cy.wait('@validateCustomer');

      cy.byTestId('validationresult-modal')
        .should('have.class', 'show')
        .within(() => {
          cy.byTestId('title').contains('Kein Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'bg-danger');
          cy.byTestId('ok-button').should('be.visible').click();
        });

      cy.intercept('POST', '/api/customers/' + customerId).as('updateCustomer');
      cy.byTestId('save-button').click();
      cy.wait('@updateCustomer');

      cy.url().should('contain', '/kunden/detail/' + customerId);
    });
  });

});
