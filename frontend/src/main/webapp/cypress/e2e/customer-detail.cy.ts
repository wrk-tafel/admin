import * as path from 'path';
import * as moment from 'moment';

// TODO optimize structure

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

    cy.byTestId('printMenuButton').click();
    cy.byTestId('printMasterdataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'stammdaten-101-musterfrau-eva.pdf');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  });

  it('generate pdf and opens for download with less data from customer', () => {
    cy.visit('/#/kunden/detail/100');

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
    cy.visit('/#/kunden/detail/300');

    cy.byTestId('deleteCustomerButton').click();

    cy.byTestId('deletecustomer-modal').should('be.visible');
    cy.byTestId('deletecustomer-modal').within(() => {
      cy.byTestId('cancelButton').click();
    });

    cy.byTestId('deletecustomer-modal').should('not.be.visible');

    cy.byTestId('deleteCustomerButton').click();
    cy.byTestId('deletecustomer-modal').within(() => {
      cy.byTestId('okButton').click();
    });

    cy.url({timeout: 10000}).should('include', '/kunden/suchen');
  });

  it('prolong customer', () => {
    cy.visit('/#/kunden/detail/100');

    let validDateString;
    cy.byTestId('validUntilText').then(($value) => {
      validDateString = $value.text();
      const expectedValidDate = moment(validDateString, 'DD.MM.YYYY').add(3, 'months').endOf('day').format('DD.MM.YYYY');

      cy.byTestId('prolongButton').click();
      cy.byTestId('prolongThreeMonthsButton').click();

      cy.byTestId('validUntilText').should('have.text', expectedValidDate);
    });
  });

  it('invalidate customer', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('invalidateCustomerButton').click();

    cy.byTestId('validUntilText').should('have.text', moment().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
  });

});
