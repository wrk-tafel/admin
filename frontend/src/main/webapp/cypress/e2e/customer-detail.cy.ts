import * as path from 'path';
import moment from 'moment';

describe('Customer Detail', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('customerId correct', () => {
    cy.visit('/#/kunden/detail/101');
    cy.byTestId('customerIdText').should('have.text', '101');
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
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('editCustomerButton').click();

    cy.url({timeout: 10000}).should('include', '/kunden/bearbeiten/101');
  });

  it('delete customer', () => {
    cy.createDummyCustomer().then((response) => {
      cy.visit('/#/kunden/detail/' + response.body.id);

      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('deleteCustomerButton').click();

      cy.byTestId('deletecustomer-modal').should('be.visible');
      cy.byTestId('deletecustomer-modal').within(() => {
        cy.byTestId('cancelButton').click();
      });

      cy.byTestId('deletecustomer-modal').should('not.be.visible');

      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('deleteCustomerButton').click();
      cy.byTestId('deletecustomer-modal').within(() => {
        cy.byTestId('okButton').click();
      });

      cy.url({timeout: 10000}).should('include', '/kunden/suchen');
    });
  });

  it('prolong customer', () => {
    cy.visit('/#/kunden/detail/100');

    let validDateString;
    cy.byTestId('validUntilText').then(($value) => {
      validDateString = $value.text();
      const expectedValidDate = moment(validDateString, 'DD.MM.YYYY').add(3, 'months').endOf('day').format('DD.MM.YYYY');

      cy.byTestId('editCustomerToggleButton').click();
      cy.byTestId('prolongButton').click();
      cy.byTestId('prolongThreeMonthsButton').click();

      cy.byTestId('validUntilText').should('have.text', expectedValidDate);
    });
  });

  it('invalidate customer', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('editCustomerToggleButton').click();
    cy.byTestId('invalidateCustomerButton').click();

    cy.byTestId('validUntilText').should('have.text', moment().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
  });

  it('lock and unlock customer', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('lock-info-banner').should('not.exist');

    cy.byTestId('editCustomerToggleButton').click();
    cy.byTestId('lockCustomerButton').click();
    cy.byTestId('lockreason-input-text').type('dummy lockreason');
    cy.byTestId('lock-customer-modal').within(() => {
      cy.byTestId('okButton').click();
    });

    cy.byTestId('lock-info-banner').should('exist');

    cy.byTestId('editCustomerToggleButton').click();
    cy.byTestId('unlockCustomerButton').click();

    cy.byTestId('lock-info-banner').should('not.exist');
  });

});
