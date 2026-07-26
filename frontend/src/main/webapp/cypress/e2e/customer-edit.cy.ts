describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginE2ETest2();
  });

  it('customer updated', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      cy.visit('/#/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      const updatedLastname = 'UpdatedLastname';
      const updatedFirstname = 'UpdatedFirstname';
      const updatedTelephoneNumber = '0699111222333';
      const updatedEmail = 'updated.customer@test.com';
      const updatedEmployer = 'Updated Employer';
      const updatedStreet = 'Updated Street';
      const updatedHouseNumber = '99B';
      const updatedCity = 'Updated City';
      const updatedPostalCode = '5678';

      const typeInto = (testId: string, value: string) => {
        const input = cy.byTestId(testId);
        input.clear();
        input.type(value);
      };

      typeInto('lastnameInput', updatedLastname);
      typeInto('firstnameInput', updatedFirstname);
      typeInto('telephoneNumberInput', updatedTelephoneNumber);
      typeInto('emailInput', updatedEmail);
      typeInto('employerInput', updatedEmployer);
      typeInto('streetInput', updatedStreet);
      typeInto('houseNumberInput', updatedHouseNumber);
      typeInto('cityInput', updatedCity);
      typeInto('postalCodeInput', updatedPostalCode);
      cy.byTestId('genderInput').select('Weiblich');

      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('ok-button').click();
        });
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/kunden/detail/' + customerId);

      cy.byTestId('nameText').should('have.text', updatedLastname + ' ' + updatedFirstname);
      cy.byTestId('genderText').should('have.text', 'Weiblich');
      cy.byTestId('telephoneNumberText').should('have.text', updatedTelephoneNumber);
      cy.byTestId('emailText').should('have.text', updatedEmail);
      cy.byTestId('employerText').should('have.text', updatedEmployer);
      cy.byTestId('addressLine1Text').should('have.text', updatedStreet + ' ' + updatedHouseNumber);
      cy.byTestId('addressLine2Text').should('have.text', updatedPostalCode + ' ' + updatedCity);
    });
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
