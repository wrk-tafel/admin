import * as path from 'path';
import * as moment from 'moment';

describe('Customer Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  afterEach(() => {
    // Cleanup: Ensure customer 101 is unlocked for next test run
    cy.request({
      method: 'POST',
      url: '/api/customers/101/unlock',
      failOnStatusCode: false
    });
  });

  it('customerId correct', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/detail/' + customerId);
      cy.byTestId('customerIdText').should('have.text', customerId.toString());
    });
  });

  it('generate pdf and opens for download', () => {
    cy.visit('/#/kunden/detail/101');

    cy.intercept('/api/customers/*/generate-pdf**', request => {
      request.on('response', function (response) {
        expect(response.statusCode).is.lessThan(500); // Test will fail if an 500 error happen
      });
    });

    cy.byTestId('printMenuButton').click();
    cy.byTestId('printMasterdataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'stammdaten-101-musterfrau-eva.pdf');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  });

  it('generate pdf and opens for download with less data from customer', () => {
    cy.visit('/#/kunden/detail/100');

    cy.intercept('/api/customers/*/generate-pdf**', request => {
      request.on('response', function (response) {
        expect(response.statusCode).is.lessThan(500); // Test will fail if an 500 error happen
      });
    });

    cy.byTestId('printMenuButton').click();
    cy.byTestId('printMasterdataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'stammdaten-100-mustermann-max-single.pdf');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  });

  it('edit customer', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/detail/' + customerId);

      cy.byTestId('editCustomerButton').click();

      cy.url({timeout: 10000}).should('include', '/kunden/bearbeiten/' + customerId);
    });
  });

  it('delete customer', () => {
    cy.createDummyCustomer().then((response) => {
      cy.visit('/#/kunden/detail/' + response.body.id);

      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('deleteCustomerButton').click();

      cy.byTestId('deletecustomer-modal').should('have.class', 'show');
      cy.byTestId('deletecustomer-modal').within(() => {
        cy.byTestId('cancelButton').click();
      });

      cy.byTestId('deletecustomer-modal').should('not.have.class', 'show');

      cy.intercept('DELETE', '/api/customers/*').as('deleteCustomer');
      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('deleteCustomerButton').click();
      cy.byTestId('deletecustomer-modal').should('have.class', 'show');
      cy.byTestId('deletecustomer-modal').within(() => {
        cy.byTestId('okButton').click();
      });
      cy.wait('@deleteCustomer');

      cy.url({timeout: 10000}).should('include', '/kunden/suchen');
    });
  });

  it('prolong customer', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/detail/' + customerId);

      cy.byTestId('validUntilText').should('be.visible');
      cy.byTestId('validUntilText').then(($value) => {
        const validDateString = $value.text();
        const expectedValidDate = moment(validDateString, 'DD.MM.YYYY').add(3, 'months').endOf('day').format('DD.MM.YYYY');

        cy.intercept('POST', '/api/customers/' + customerId).as('prolongCustomer');
        cy.byTestId('editCustomerToggleButton').click();
        cy.byTestId('prolongButton').click();
        cy.byTestId('prolongThreeMonthsButton').click();
        cy.wait('@prolongCustomer');

        // Reload to let the resolver fetch the updated data from the backend
        cy.reload();
        cy.byTestId('validUntilText').should('have.text', expectedValidDate);
      });
    });
  });

  it('invalidate customer', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/detail/' + customerId);

      cy.byTestId('editCustomerToggleButton').should('be.visible');

      cy.intercept('POST', '/api/customers/' + customerId).as('invalidateCustomer');
      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('invalidateCustomerButton').click();
      cy.wait('@invalidateCustomer');

      // Reload to let the resolver fetch the updated data from the backend
      cy.reload();
      cy.byTestId('validUntilText').should('have.text', moment().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
    });
  });

  it('lock and unlock customer', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;
      cy.visit('/#/kunden/detail/' + customerId);

      cy.byTestId('editCustomerToggleButton').should('be.visible');
      cy.byTestId('lock-info-banner').should('not.exist');

      cy.intercept('POST', '/api/customers/' + customerId).as('lockCustomer');
      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('lockCustomerButton').click();
      cy.byTestId('lockreason-input-text').type('dummy lockreason');
      cy.byTestId('lock-customer-modal').within(() => {
        cy.byTestId('okButton').click();
      });
      cy.wait('@lockCustomer');

      cy.byTestId('lock-info-banner').should('exist');

      cy.intercept('POST', '/api/customers/' + customerId).as('unlockCustomer');
      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('unlockCustomerButton').click();
      cy.wait('@unlockCustomer');

      cy.byTestId('lock-info-banner').should('not.exist');
    });
  });

});
