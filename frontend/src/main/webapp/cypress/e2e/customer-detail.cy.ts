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
    cy.visit('/kunden/detail/101');
    cy.byTestId('customerIdText').should('have.text', '101');
  });

  it('generate pdf and opens for download', () => {
    cy.visit('/kunden/detail/101');
    generateAndDownloadPdf('stammdaten-101-musterfrau-eva.pdf');
  });

  it('generate pdf and opens for download with less data from customer', () => {
    cy.visit('/kunden/detail/100');
    generateAndDownloadPdf('stammdaten-100-mustermann-max-single.pdf');
  });

  it('edit customer', () => {
    cy.visit('/kunden/detail/101');

    cy.byTestId('editCustomerButton').click();

    cy.url({timeout: 10000}).should('include', '/kunden/bearbeiten/101');
  });

  it('delete customer', () => {
    cy.createDummyCustomer().then((response) => {
      cy.visit('/kunden/detail/' + response.body.data.id);

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
    cy.visit('/kunden/detail/100');

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
    cy.visit('/kunden/detail/101');

    openEditMenu();
    cy.byTestId('invalidateCustomerButton').click();

    cy.byTestId('validUntilText').should('have.text', dayjs().subtract(1, 'day').endOf('day').format('DD.MM.YYYY'));
  });

  it('lock and unlock customer', () => {
    cy.visit('/kunden/detail/101');

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
    cy.visit('/kunden/detail/101');

    cy.byTestId('latest-customer-note').should('be.visible');
    cy.byTestId('latest-customer-note-none').should('not.exist');
  });

  it('customer note not shown', () => {
    cy.visit('/kunden/detail/100');

    cy.byTestId('latest-customer-note').should('not.exist');
    cy.byTestId('latest-customer-note-none').should('be.visible');
  });

  // Customer 103's notes are all inserted in one testdata transaction, so they share a single
  // created_at to the microsecond. Tracking the list by that timestamp collapsed every row onto
  // one key (NG0955) - only a real render over real data shows all ten actually surviving.
  it('all notes dialog lists every note of a customer whose notes share a timestamp', () => {
    cy.visit('/kunden/detail/103');

    cy.byTestId('showall-notes-button').click();

    // Scoped to the dialog - the "latest note" panel behind it carries the same testid.
    cy.get('mat-dialog-content').within(() => {
      cy.byTestId('note-title').should('have.length', 10);
      // Newest first, so note 10 is at the top and note 1 sits below the dialog's scroll fold.
      cy.contains('Testnotiz 10.').should('be.visible');
      cy.contains('Testnotiz 1.').scrollIntoView().should('be.visible');
    });
  });

  // The panel and the dialog render the same note text and used to disagree about it: the panel
  // interpreted it as HTML, the dialog escaped it. Both now show plain text with real newlines.
  it('note text renders identically as plain text in the panel and the dialog', () => {
    cy.visit('/kunden/detail/103');

    // The testdata note carries a real newline; it has to survive as one instead of collapsing.
    const assertPlainTextWithNewline = () => {
      cy.byTestId('note-text')
        .filterDisplayed()
        .first()
        .invoke('text')
        .should('contain', 'Testnotiz 10.\nLorem ipsum');
    };

    assertPlainTextWithNewline();

    cy.byTestId('showall-notes-button').click();
    cy.get('mat-dialog-content').within(() => {
      assertPlainTextWithNewline();
    });
  });

  it('renders responsively on phone (content before actions) and still allows locking/unlocking', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/kunden/detail/101');

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

  it('lets the overflowing detail tab header scroll natively instead of only via pagination arrows', () => {
    // the tab labels only reliably overflow the available width at phone size for this page's
    // 3 tabs, but the underlying fix (see #3024) is viewport-agnostic - it also covers tablet
    // and desktop (trackpad/shift+wheel), which just aren't exercised by this particular page
    cy.viewport(PHONE_VIEWPORT);
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      cy.visit('/kunden/detail/' + customerId);

      // Material's default click-only pagination arrows are hidden in favor of native
      // touch/swipe scrolling of the tab header
      cy.get('.mat-mdc-tab-header-pagination-before').should('not.be.visible');
      cy.get('.mat-mdc-tab-header-pagination-after').should('not.be.visible');

      // the tab labels overflow the phone viewport width, so the "Dokumente" tab starts out
      // scrolled out of view - reaching and clicking it exercises the native horizontal scroll
      cy.byTestId('documents-tab-label').scrollIntoView().click();
      cy.byTestId('upload-document-panel').should('be.visible');
    });
  });

  it('renders correctly at tablet breakpoint and still allows prolonging', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/kunden/detail/100');

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
    cy.visit('/kunden/detail/100');

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
      cy.visit('/kunden/detail/100');

      cy.byTestId('ticket-number-input').should('be.visible');
      cy.byTestId('assign-ticket-button').should('be.visible');
    });

    it('assign ticket to customer', () => {
      cy.visit('/kunden/detail/100');

      cy.byTestId('ticket-number-input').type('15');
      cy.byTestId('assign-ticket-button').should('not.be.disabled');
      cy.byTestId('assign-ticket-button').click();

      cy.byTestId('ticket-number-display').should('be.visible');
      cy.byTestId('ticket-number-display').should('contain.text', '15');
      cy.byTestId('delete-ticket-button').should('be.visible');
    });

    it('delete assigned ticket from customer', () => {
      cy.addCustomerToDistribution({customerId: 100, ticketNumber: 25});
      cy.visit('/kunden/detail/100');

      cy.byTestId('ticket-number-display').should('contain.text', '25');
      cy.byTestId('delete-ticket-button').click();

      cy.byTestId('ticket-number-input').should('be.visible');
      cy.byTestId('ticket-number-display').should('not.exist');
    });

    it('assign ticket button disabled when input is empty', () => {
      cy.visit('/kunden/detail/100');

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
    // Specs below switch the scanner folder off through the backend's own config file; leaving it
    // off would silently disable the source for everything that runs afterwards.
    afterEach(() => {
      cy.task('clearBackendConfig');
    });

    it('upload, download and delete a document', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');
        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-PROOF_OF_INCOME').click();
        cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
        cy.byTestId('okButton').click();

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

        cy.byTestId('upload-document-panel').should('be.visible');
      });
    });

    it('moves document actions below the filename on phone, keeps them alongside it on tablet/desktop', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

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
        cy.visit('/kunden/detail/' + customerId);

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

    /**
     * The scanner folder is optional per deployment (`tafeladmin.storage.scannerPath` plus the
     * `features.scannerFolderEnabled` kill switch), and the e2e backend has it on - so the "off" case is driven by
     * stubbing the config endpoint the frontend reads it from rather than by restarting the backend.
     */
    it('hides the scanner source when the deployment has no scanner folder', () => {
      cy.intercept('GET', '/api/config', (req) => {
        req.continue((res) => {
          res.body = {...res.body, scannerFolderEnabled: false};
        });
      }).as('config');

      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');
        cy.wait('@config');

        cy.byTestId('documentSourceToggle').should('not.exist');
        cy.byTestId('documentSourceScanner').should('not.exist');
        // uploading a file from the device is never optional, so the panel stays usable
        cy.byTestId('documentDropzone').should('be.visible');
      });
    });

    /**
     * The end-to-end proof that a deployment's configuration is editable at runtime: unlike the
     * stubbed "off" case above, nothing here fakes a response - the operator's edit goes into the
     * real config file, the backend re-reads it (once a second under the e2e profile) and pushes the
     * new config over SSE to a page that stays open the whole time.
     */
    it('drops and restores the scanner source when the backend config is edited, without a reload', () => {
      const scannerDisabledConfig = ['tafeladmin:', '  features:', '    scannerFolderEnabled: false'].join('\n');
      cy.task('clearBackendConfig');

      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');
        cy.byTestId('documentSourceScanner').should('be.visible').click();

        cy.task('writeBackendConfig', scannerDisabledConfig);

        cy.byTestId('documentSourceToggle', {timeout: 20000}).should('not.exist');
        // the user was standing on the scanner source, so they get put back on the file upload
        cy.byTestId('documentDropzone').should('be.visible');

        cy.task('clearBackendConfig');

        cy.byTestId('documentSourceScanner', {timeout: 20000}).should('be.visible');
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
        cy.visit('/kunden/detail/' + customerId);

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
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.be.greaterThan(0);
        });

        cy.byTestId('costContributionButton').scrollIntoView().should('be.visible').click();
        cy.byTestId('payCostContributionAllButton').should('be.visible').click();

        // the payment is applied async (API round-trip), so the assertion needs to retry/re-read
        // the element rather than reading its text once right after the click
        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(0);
        });

        cy.byTestId('costContributionButton').click();
        cy.byTestId('payCostContributionAllButton').should('not.exist');
        cy.byTestId('payCostContributionAmountButton').should('not.exist');
        cy.byTestId('editCostContributionButton').should('be.visible');

        // belt-and-suspenders: make sure this dummy customer ends the test with zero debt (see
        // the "pay off a specific amount" test below for why this matters for other specs)
        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
      });
    });

    it('pay off a specific amount of the pending debt', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('pendingCostContributionText').invoke('text').then(parseCurrencyText).then((initialAmount) => {
          cy.byTestId('costContributionButton').scrollIntoView().click();
          cy.byTestId('payCostContributionAmountButton').click();
          cy.byTestId('pay-cost-contribution-dialog').should('be.visible').within(() => {
            cy.byTestId('amount-input').type('1');
            cy.byTestId('okButton').click();
          });

          cy.byTestId('pendingCostContributionText').should(($el) => {
            expect(parseCurrencyText($el.text())).to.be.closeTo(initialAmount - 1, 0.01);
          });

          cy.byTestId('costContributionButton').click();
          cy.byTestId('payCostContributionAllButton').should('be.visible');

          // clear the remainder via the API (rather than another UI round-trip) - other specs
          // (e.g. customer-search.cy.ts's "search by cost contribution") assert on the total
          // count of customers with pending debt, so a dummy customer left with a nonzero
          // balance here would leak into and break that assertion
          cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
        });
      });
    });

    it('edit the pending debt to an arbitrary amount', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(0);
        });

        cy.byTestId('costContributionButton').scrollIntoView().click();
        cy.byTestId('editCostContributionButton').click();
        cy.byTestId('edit-cost-contribution-dialog').should('be.visible').within(() => {
          cy.byTestId('amount-input').clear().type('75');
          cy.byTestId('okButton').click();
        });

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(75);
        });

        // reset back to zero via the API - other specs (e.g. customer-search.cy.ts's "search by
        // cost contribution") assert on the total count of customers with pending debt, so a
        // dummy customer left with a nonzero balance here would leak into and break that assertion
        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
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
        cy.visit('/kunden/detail/' + customerId);

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

        cy.visit('/kunden/detail/' + customerId);
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

        cy.visit('/kunden/detail/' + customerId);
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

        cy.visit('/kunden/detail/' + customerId);
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

  describe('Verlauf tab', () => {

    it('shows the change history of the customer', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/kunden/detail/' + customerId);
        cy.byTestId('history-tab-label').scrollIntoView().click();

        cy.byTestId('customer-history').should('be.visible');
        cy.byTestId('audit-entry-list').should('exist');
        cy.byTestId('audit-entry-0-actor').should('contain.text', 'e2etest');
      });
    });

    it('shows what an edit changed, with the previous value', () => {
      cy.createDummyCustomer().then((response) => {
        const customer = response.body.data;

        cy.updateCustomer({...customer, telephoneNumber: '0699333444'});

        cy.visit('/kunden/detail/' + customer.id);
        cy.byTestId('history-tab-label').scrollIntoView().click();

        cy.byTestId('audit-entry-0-changes').should('contain.text', 'Telefon');
        cy.byTestId('audit-entry-0-changes').should('contain.text', '0699333444');
      });
    });

    it('pages through the history', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        cy.visit('/kunden/detail/' + customerId);
        cy.byTestId('history-tab-label').scrollIntoView().click();

        cy.byTestId('customer-history-paginator').should('exist');
      });
    });

    it('hides the tab from a user without the audit permission', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        // e2etest2 holds CUSTOMER and nothing else, so it can open the customer but must not see
        // every change ever made to them - those are separate levels of access.
        cy.loginE2ETest2();
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('customerIdText').should('have.text', String(customerId));
        cy.byTestId('history-tab-label').should('not.exist');
      });
    });

  });

});
