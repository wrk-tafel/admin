import * as path from 'path';
import * as moment from 'moment';

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
    generateAndDownloadPdf('stammdaten-101-musterfrau-eva.pdf');
  });

  it('generate pdf and opens for download with less data from customer', () => {
    cy.visit('/#/kunden/detail/100');
    generateAndDownloadPdf('stammdaten-100-mustermann-max-single.pdf');
  });

  it('edit customer', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('editCustomerButton').click();

    cy.url({timeout: 10000}).should('include', '/kunden/bearbeiten/101');
  });

  it('delete customer', () => {
    cy.createDummyCustomer().then((response) => {
      cy.visit('/#/kunden/detail/' + response.body.id);

      openEditMenu();
      cy.byTestId('deleteCustomerButton').click();

      cy.byTestId('deletecustomer-dialog').should('be.visible');
      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('cancelButton').click();
      });

      cy.wait(6000);
      cy.byTestId('deletecustomer-dialog').should('not.exist');

      openEditMenu();
      cy.byTestId('deleteCustomerButton').click();
      cy.byTestId('deletecustomer-dialog').within(() => {
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

      openEditMenu();
      cy.byTestId('prolongButton').click();
      cy.byTestId('prolongThreeMonthsButton').click();

      cy.byTestId('validUntilText').should('have.text', expectedValidDate);
    });
  });

  it('invalidate customer', () => {
    cy.visit('/#/kunden/detail/101');

    openEditMenu();
    cy.byTestId('invalidateCustomerButton').click();

    cy.byTestId('validUntilText').should('have.text', moment().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
  });

  it('lock and unlock customer', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('lock-info-banner').should('not.exist');

    openEditMenu();
    cy.byTestId('lockCustomerButton').click();
    cy.byTestId('lockreason-input-text').type('dummy lockreason');
    cy.byTestId('lock-customer-dialog').within(() => {
      cy.byTestId('okButton').click();
    });

    cy.byTestId('lock-info-banner').should('exist');

    openEditMenu();
    cy.byTestId('unlockCustomerButton').click();

    cy.byTestId('lock-info-banner').should('not.exist');
  });

  it('customer note shown', () => {
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('latest-customer-note').should('be.visible');
    cy.byTestId('latest-customer-note-none').should('not.exist');
  });

  it('customer note not shown', () => {
    cy.visit('/#/kunden/detail/100');

    cy.byTestId('latest-customer-note').should('not.exist');
    cy.byTestId('latest-customer-note-none').should('be.visible');
  });

  it('ticket section not visible when no distribution is active', () => {
    cy.visit('/#/kunden/detail/100');

    cy.byTestId('ticket-number-input').should('not.exist');
    cy.byTestId('ticket-number-display').should('not.exist');
  });

  describe('ticket assignment', () => {
    beforeEach(() => {
      cy.createDistribution();
    });

    afterEach(() => {
      cy.closeDistribution();
    });

    it('ticket section visible when distribution is active', () => {
      cy.visit('/#/kunden/detail/100');

      cy.byTestId('ticket-number-input').should('be.visible');
      cy.byTestId('assign-ticket-button').should('be.visible');
    });

    it('assign ticket to customer', () => {
      cy.visit('/#/kunden/detail/100');

      cy.byTestId('ticket-number-input').type('15');
      cy.byTestId('assign-ticket-button').should('not.be.disabled');
      cy.byTestId('assign-ticket-button').click();

      cy.byTestId('ticket-number-display').should('be.visible');
      cy.byTestId('ticket-number-display').should('contain.text', '15');
      cy.byTestId('delete-ticket-button').should('be.visible');
    });

    it('delete assigned ticket from customer', () => {
      cy.addCustomerToDistribution({customerId: 100, ticketNumber: 25});
      cy.visit('/#/kunden/detail/100');

      cy.byTestId('ticket-number-display').should('contain.text', '25');
      cy.byTestId('delete-ticket-button').click();

      cy.byTestId('ticket-number-input').should('be.visible');
      cy.byTestId('ticket-number-display').should('not.exist');
    });

    it('assign ticket button disabled when input is empty', () => {
      cy.visit('/#/kunden/detail/100');

      cy.byTestId('assign-ticket-button').should('be.disabled');
    });
  });

  function generateAndDownloadPdf(expectedFilename: string) {
    cy.intercept('/api/customers/*/generate-pdf**', request => {
      request.on('response', function (response) {
        expect(response.statusCode).is.lessThan(500);
      });
    });

    cy.byTestId('printMenuButton').click();
    cy.byTestId('printMasterdataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, expectedFilename);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(20000));
  }

  function openEditMenu() {
    cy.byTestId('editCustomerToggleButton').click();
  }

});
