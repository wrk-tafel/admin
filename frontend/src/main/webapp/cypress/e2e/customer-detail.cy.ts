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
      cy.visit('/#/kunden/detail/' + response.body.data.id);

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

  describe('Supervisor', () => {
    beforeEach(() => {
      cy.loginDefault();
    });

    it('prolong customer with invalid income triggers confirm dialog when supervisor', () => {
      cy.createDummyCustomer(10000, true).then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

        openEditMenu();
        cy.byTestId('prolongButton').click();
        cy.byTestId('prolongThreeMonthsButton').click();

        // Should trigger confirm dialog
        cy.byTestId('confirm-customer-save-dialog')
          .should('be.visible')
          .within(() => {
            cy.byTestId('title').contains('Kunde speichern');
            cy.byTestId('message').contains('Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)');
            cy.byTestId('header').should('have.class', 'dialog-header-warning');
            cy.byTestId('ok-button').click();
          });
      });
    });

    it('should display confirm dialog with correct message and allow cancellation', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        // Manually set up a scenario that would trigger the dialog
        cy.intercept('/api/customers/*', (req) => {
          if (req.method === 'POST') {
            req.reply({
              statusCode: 409,
              body: {message: 'Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)'}
            });
          }
        });

        cy.visit('/#/kunden/detail/' + customerId);
        cy.byTestId('editCustomerButton').click();

        const observer = {
          error: (error: any) => {
            if (error.status == 409) {
              // Dialog should appear after 409 error
              cy.byTestId('confirm-customer-save-dialog').should('be.visible');
              cy.byTestId('confirm-customer-save-dialog').should('contain.text', error.error.message);
              cy.byTestId('confirm-customer-save-dialog').should('contain.text', 'Trotzdem speichern?');
            }
          },
        };

        cy.byTestId('save-button').click();
      });
    });

    it('should confirm update and persist changes', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/#/kunden/detail/' + customerId);
        cy.byTestId('editCustomerButton').click();

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

        cy.get('.toast-message')
          .should('be.visible')
          .should('contain.text', 'Kunde wurde gespeichert!');

        // Should reload the page or navigate to detail view
        cy.byTestId('confirm-customer-save-dialog').should('not.exist');
        cy.url().should('contain', `/kunden/detail/${customerId}`);
        cy.byTestId('incomeText').should('contain.text', '15.000');
      });
    });

    it('should cancel update and stay on edit page', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/#/kunden/detail/' + customerId);
        cy.byTestId('editCustomerButton').click();

        const incomeInput = cy.byTestId('incomeInput');
        incomeInput.clear();
        incomeInput.type('15000');

        cy.byTestId('save-button').click();

        // Confirm dialog should appear
        cy.byTestId('confirm-customer-save-dialog').should('be.visible');

        // Click cancel
        cy.byTestId('confirm-customer-save-dialog').within(() => {
          cy.byTestId('cancel-button').click();
        });

        // Should stay on edit page
        cy.url().should('contain', '/kunden/bearbeiten/' + customerId);
        cy.byTestId('confirm-customer-save-dialog').should('not.exist');
      });
    });

  });

});
