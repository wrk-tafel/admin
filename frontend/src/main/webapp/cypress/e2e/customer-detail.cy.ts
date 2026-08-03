import * as path from 'path';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

dayjs.extend(customParseFormat);

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
      const expectedValidDate = dayjs(validDateString, 'DD.MM.YYYY').add(3, 'months').endOf('day').format('DD.MM.YYYY');

      cy.byTestId('prolongButton').click();
      cy.byTestId('prolongThreeMonthsButton').click();

      cy.byTestId('validUntilText').should('have.text', expectedValidDate);
    });
  });

  it('invalidate customer', () => {
    cy.visit('/#/kunden/detail/101');

    openEditMenu();
    cy.byTestId('invalidateCustomerButton').click();

    cy.byTestId('validUntilText').should('have.text', dayjs().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
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

  it('renders responsively on phone (content before actions) and still allows locking/unlocking', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/#/kunden/detail/101');

    cy.byTestId('customerIdText').should('be.visible');
    cy.byTestId('latest-customer-note').scrollIntoView().should('be.visible');
    cy.byTestId('editCustomerButton').scrollIntoView().should('be.visible');

    // below lg: the outer section reverses (flex-col-reverse), so the data tabs render
    // above the action buttons instead of below them
    cy.byTestId('customerIdText').then(($content) => {
      const contentTop = $content[0].getBoundingClientRect().top;
      cy.byTestId('editCustomerButton').then(($actionButton) => {
        expect(contentTop).to.be.lessThan($actionButton[0].getBoundingClientRect().top);
      });
    });

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

  it('renders correctly at tablet breakpoint and still allows prolonging', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/#/kunden/detail/100');

    cy.byTestId('customerIdText').should('be.visible');
    cy.byTestId('latest-customer-note-none').should('be.visible');

    let validDateString;
    cy.byTestId('validUntilText').then(($value) => {
      validDateString = $value.text();
      const expectedValidDate = dayjs(validDateString, 'DD.MM.YYYY').add(1, 'months').endOf('day').format('DD.MM.YYYY');

      cy.byTestId('prolongButton').click();
      cy.byTestId('prolongOneMonthButton').click();

      cy.byTestId('validUntilText').should('have.text', expectedValidDate);
    });
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
    cy.intercept('/api/households/*/generate-pdf**', request => {
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

  /** Parses a de-DE `currency` pipe rendering (e.g. "4,00 €") into a plain number. */
  function parseCurrencyText(text: string): number {
    const match = text.replace(/\./g, '').match(/-?\d+,\d+/);
    return match ? parseFloat(match[0].replace(',', '.')) : NaN;
  }

  describe('documents', () => {
    it('upload, download and delete a document', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('nodocuments-label').should('be.visible');

        cy.byTestId('upload-document-panel').should('be.visible');
        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-PROOF_OF_INCOME').click();
        cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
        cy.byTestId('okButton').click();

        cy.byTestId('nodocuments-label').should('not.exist');
        cy.byTestId('document-0-fileNameText').should('have.text', 'test-document.pdf');

        const downloadsFolder = Cypress.config('downloadsFolder');
        const downloadedFilePath = path.join(downloadsFolder, 'test-document.pdf');
        cy.byTestId('document-0-downloadButton').click();
        cy.readFile(downloadedFilePath, 'binary', {timeout: 15000})
          .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));

        cy.byTestId('document-0-deleteButton').click();
        cy.byTestId('deletedocument-dialog').should('be.visible');
        cy.byTestId('deletedocument-dialog').within(() => {
          cy.byTestId('okButton').click();
        });

        cy.byTestId('nodocuments-label').should('be.visible');
      });
    });

    it('moves document actions below the filename on phone, keeps them alongside it on tablet/desktop', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');
        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-PROOF_OF_INCOME').click();
        cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
        cy.byTestId('okButton').click();
        cy.byTestId('document-0-metaText').should('be.visible');

        // "same row" means the button's vertical range overlaps the (3-line) info block's -
        // "moved below" means the button starts only after the info block ends
        function expectActionsBesideInfo() {
          cy.byTestId('document-0-metaText').then(($metaText) => {
            const infoBottom = $metaText[0].getBoundingClientRect().bottom;
            cy.byTestId('document-0-downloadButton').then(($downloadButton) => {
              expect($downloadButton[0].getBoundingClientRect().top).to.be.lessThan(infoBottom);
            });
          });
        }

        function expectActionsBelowInfo() {
          cy.byTestId('document-0-metaText').then(($metaText) => {
            const infoBottom = $metaText[0].getBoundingClientRect().bottom;
            cy.byTestId('document-0-downloadButton').then(($downloadButton) => {
              expect($downloadButton[0].getBoundingClientRect().top).to.be.greaterThan(infoBottom - 1);
            });
          });
        }

        function expectMetaDateAndUserOnSameLine() {
          cy.byTestId('document-0-metaText-date').then(($date) => {
            const dateTop = $date[0].getBoundingClientRect().top;
            cy.byTestId('document-0-metaText-user').then(($user) => {
              expect($user[0].getBoundingClientRect().top).to.be.closeTo(dateTop, 2);
            });
          });
        }

        function expectMetaDateAndUserOnSeparateLines() {
          cy.byTestId('document-0-metaText-date').then(($date) => {
            const dateBottom = $date[0].getBoundingClientRect().bottom;
            cy.byTestId('document-0-metaText-user').then(($user) => {
              expect($user[0].getBoundingClientRect().top).to.be.greaterThan(dateBottom - 1);
            });
          });
        }

        // desktop (default 1024x768 viewport): actions sit beside the info block, same row;
        // upload date and uploading user share one line
        expectActionsBesideInfo();
        expectMetaDateAndUserOnSameLine();

        cy.viewport(TABLET_VIEWPORT);
        expectActionsBesideInfo();
        expectMetaDateAndUserOnSameLine();

        cy.viewport(PHONE_VIEWPORT);
        expectActionsBelowInfo();
        expectMetaDateAndUserOnSeparateLines();
      });
    });

    it('import a document from the scanner folder', () => {
      cy.task('clearScannerInbox');
      const scannerFileName = 'scan-e2e-test.pdf';
      cy.task('writeScannerFile', {fileName: scannerFileName, content: '%PDF-1.1 test content'});

      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');

        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-OTHER').click();

        cy.byTestId('documentSourceScanner').click();
        cy.byTestId('scannerFile-' + scannerFileName, {timeout: 10000}).should('be.visible').click();
        cy.byTestId('okButton').click();

        // the imported document's filename is derived from the document type + import time, not
        // the scanner's own generic filename (see HouseholdDocumentService.deriveScannerImportFileName)
        cy.byTestId('document-0-fileNameText').invoke('text').should('match', /^Sonstiges_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);

        // the imported file is removed from the scanner inbox, so it must not be offered again -
        // the panel's scanner list is live (SSE) and stays mounted (no dialog reopen needed)
        cy.byTestId('noScannerFiles', {timeout: 10000}).should('be.visible');
      });
    });

    it('imports the selected scanner file, not just the newest one', () => {
      cy.task('clearScannerInbox');
      const olderFileName = 'scan-older.pdf';
      const newerFileName = 'scan-newer.pdf';
      cy.task('writeScannerFile', {fileName: olderFileName, content: '%PDF-1.1 OLDER-CONTENT'});
      cy.wait(1100);
      cy.task('writeScannerFile', {fileName: newerFileName, content: '%PDF-1.1 NEWER-CONTENT'});

      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');

        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-OTHER').click();

        cy.byTestId('documentSourceScanner').click();
        // deliberately select the OLDER file (not the default/newest one)
        cy.byTestId('scannerFile-' + olderFileName, {timeout: 10000}).should('be.visible').click();
        cy.byTestId('okButton').click();

        cy.byTestId('document-0-fileNameText').should('be.visible').invoke('text').then((fileName) => {
          const downloadsFolder = Cypress.config('downloadsFolder');
          const downloadedFilePath = path.join(downloadsFolder, fileName);
          cy.byTestId('document-0-downloadButton').click();
          cy.readFile(downloadedFilePath, 'utf8', {timeout: 15000})
            .should('include', 'OLDER-CONTENT');
        });
      });
    });
  });

  describe('cost contribution debt', () => {
    it('pay off the full pending debt at once', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.accrueCostContributionDebt(customerId);

        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.be.greaterThan(0);
        });

        cy.byTestId('payCostContributionAllButton').scrollIntoView().should('be.visible').click();

        // the payment is applied async (API round-trip), so the assertion needs to retry/re-read
        // the element rather than reading its text once right after the click
        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(0);
        });
        cy.byTestId('payCostContributionAllButton').should('not.exist');
        cy.byTestId('payCostContributionAmountButton').should('not.exist');
      });
    });

    it('pay off a specific amount of the pending debt', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.accrueCostContributionDebt(customerId);

        cy.visit('/#/kunden/detail/' + customerId);

        cy.byTestId('pendingCostContributionText').invoke('text').then(parseCurrencyText).then((initialAmount) => {
          cy.byTestId('payCostContributionAmountButton').scrollIntoView().click();
          cy.byTestId('pay-cost-contribution-dialog').should('be.visible').within(() => {
            cy.byTestId('amount-input').type('1');
            cy.byTestId('okButton').click();
          });

          cy.byTestId('pendingCostContributionText').should(($el) => {
            expect(parseCurrencyText($el.text())).to.be.closeTo(initialAmount - 1, 0.01);
          });
          cy.byTestId('payCostContributionAllButton').should('be.visible');
        });
      });
    });
  });

  describe('Supervisor', () => {
    beforeEach(() => {
      cy.loginDefault();
    });

    it('prolong customer with invalid income triggers confirm dialog when supervisor', () => {
      cy.createDummyCustomer(10000, true).then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/#/kunden/detail/' + customerId);

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
        cy.intercept('/api/households/*', (req) => {
          if (req.method === 'PUT') {
            req.reply({
              statusCode: 409,
              body: {detail: 'Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)'}
            });
          }
        });

        cy.visit('/#/kunden/detail/' + customerId);
        cy.byTestId('editCustomerButton').click();

        cy.byTestId('save-button').click();

        // Dialog should appear after 409 error
        cy.byTestId('confirm-customer-save-dialog')
          .should('be.visible')
          .and('contain.text', 'Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)')
          .and('contain.text', 'Trotzdem speichern?');
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
