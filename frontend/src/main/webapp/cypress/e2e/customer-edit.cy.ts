describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginE2ETest2();
  });

  it('customer updated', () => {
    cy.visit('/#/kunden/bearbeiten/102');

    cy.byTestId('save-button').should('be.enabled');

    cy.byTestId('validate-button').click();

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('ok-button').click();
      });
    cy.byTestId('save-button').click();

    cy.url().should('contain', '/kunden/detail/102');

    // TODO change actual data (but for that create a new dedicated customer beforehand)
  });

  it('customer invalid and saved but invalid', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      cy.visit('/#/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      const incomeInput = cy.byTestId('incomeInput');
      incomeInput.clear();
      incomeInput.type('10000');

      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Kein Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'dialog-header-danger');
          cy.byTestId('ok-button').click();
        });

      cy.byTestId('save-button').click();

      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet');

      cy.url().should('contain', '/kunden/detail/' + customerId);
    });
  });

  describe('Supervisor', () => {

    beforeEach(() => {
      cy.loginDefault();
    });

    it('supervisor should be able to force update customer', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/bearbeiten/' + customerId);

        // Set income within limits
        const incomeInput = cy.byTestId('incomeInput');
        incomeInput.clear();
        incomeInput.type('15000');

        cy.byTestId('save-button').click();

        cy.byTestId('confirm-customer-save-dialog')
          .should('be.visible')
          .within(() => {
            cy.byTestId('title').contains('Kunde speichern');
            cy.byTestId('message').contains('Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)');
            cy.byTestId('header').should('have.class', 'dialog-header-warning');
            cy.byTestId('ok-button').click();
          });

        // Should navigate to detail page after successful save
        cy.url().should('contain', '/kunden/detail/' + customerId);
      });
    });
  });

});
