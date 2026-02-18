describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('customer updated', () => {
    cy.visit('/#/kunden/bearbeiten/102');

    cy.byTestId('save-button').should('be.enabled');

    cy.byTestId('validate-button').click();

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('ok-button').click();
      });

    cy.intercept('PUT', '/api/customers/*').as('updateCustomer');
    cy.byTestId('save-button').click();
    cy.wait('@updateCustomer');

    cy.url().should('contain', '/kunden/detail/102');

    // TODO change actual data (but for that create a new dedicated customer beforehand)
  });

  it('customer invalid but still updatable', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      const incomeInput = cy.byTestId('incomeInput');
      incomeInput.clear();
      incomeInput.type('10000');

      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-modal')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Kein Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'bg-danger');
          cy.byTestId('ok-button').click();
        });

      cy.intercept('PUT', '/api/customers/*').as('updateCustomer');
      cy.byTestId('save-button').click();
      cy.wait('@updateCustomer');

      cy.url().should('contain', '/kunden/detail/' + customerId);
    });
  });

});
