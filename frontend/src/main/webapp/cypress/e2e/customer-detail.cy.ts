import * as path from 'path';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

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

    // Generating the Stammdatenblatt is one of the GDPR-sensitive reads recorded in the audit
    // trail (issue #3180) - proven here against the real backend, not just a mocked unit test.
    cy.byTestId('history-tab-label').click();
    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kunde');
  });

  it('generate pdf and opens for download with less data from customer', () => {
    cy.visit('/kunden/detail/100');
    generateAndDownloadPdf('stammdaten-100-mustermann-max-single.pdf');
  });

  it('generate privacy notice pdf and opens for download', () => {
    cy.visit('/kunden/detail/101');
    generateAndDownloadPdf('datenschutzerklaerung-101-musterfrau-eva.pdf', 'printPrivacyNoticeButton');
  });

  it('export household data (GDPR takeout) and downloads the JSON file', () => {
    cy.visit('/kunden/detail/101');

    openEditMenu();
    cy.byTestId('exportDataButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'datenexport-101-musterfrau-eva.json');

    // cy.readFile parses a `.json` file into an object rather than handing back raw text.
    cy.readFile(downloadedFilename, {timeout: 15000}).then((parsed) => {
      expect(parsed.household.id).to.equal(101);
      expect(parsed.notes).to.have.length(3);
      expect(parsed.attendances).to.be.an('array');
    });

    // The export is one of the GDPR-sensitive reads recorded in the audit trail (issue #3180) -
    // proven here against the real backend, not just a mocked unit test.
    cy.byTestId('history-tab-label').click();
    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kunde');
  });

  it('export household documents (GDPR takeout) and downloads a ZIP with the uploaded file', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      const lastname = response.body.data.lastname.toLowerCase();
      const firstname = response.body.data.firstname.toLowerCase();
      cy.visit('/kunden/detail/' + customerId);

      cy.byTestId('documents-tab-label').click();
      cy.byTestId('documentTypeInput').click();
      cy.byTestId('documentTypeInput-option-PROOF_OF_INCOME').click();
      cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
      cy.byTestId('okButton').click();
      cy.byTestId('document-0-fileNameText').should('have.text', 'test-document.pdf');

      openEditMenu();
      cy.byTestId('exportDocumentsButton').click();

      const downloadsFolder = Cypress.config('downloadsFolder');
      const downloadedFilename = path.join(downloadsFolder, `dokumente-${customerId}-${lastname}-${firstname}.zip`);

      // A ZIP holding at least one real document is well past the ~22 bytes of an empty archive.
      cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
        .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(100));
    });
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

    // ...and the actions leave the identity header, which keeps them on desktop only
    cy.byTestId('customer-identity-header').find('[testid="editCustomerButton"]').should('not.exist');

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

  it('renders the action buttons in the identity header on desktop', () => {
    // default 1024x768 viewport is at the lg breakpoint, so the desktop placement applies
    cy.visit('/kunden/detail/101');

    cy.byTestId('customer-identity-header').within(() => {
      cy.byTestId('prolongButton').should('be.visible');
      cy.byTestId('editCustomerToggleButton').should('be.visible');
    });

    // top-right corner: the actions start no lower than the name and end at the header's right edge
    cy.byTestId('identity-name').then(($name) => {
      const nameTop = $name[0].getBoundingClientRect().top;
      cy.byTestId('prolongButton').then(($button) => {
        expect($button[0].getBoundingClientRect().top).to.be.lessThan(nameTop + $name[0].getBoundingClientRect().height);
      });
    });
    cy.byTestId('customer-identity-header').then(($header) => {
      const headerRight = $header[0].getBoundingClientRect().right;
      cy.byTestId('editCustomerToggleButton').then(($button) => {
        expect($button[0].getBoundingClientRect().right).to.be.greaterThan(headerRight - 100);
      });
    });
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
    // the notes panel sits below the fold at tablet height - scroll to it the way a user would
    cy.byTestId('latest-customer-note-none').scrollIntoView().should('be.visible');

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

  function generateAndDownloadPdf(expectedFilename: string, buttonTestId = 'printMasterdataButton') {
    cy.intercept('/api/households/*/generate-pdf**', request => {
      request.on('response', function (response) {
        expect(response.statusCode).is.lessThan(500);
      });
    });

    cy.byTestId('printMenuButton').click();
    cy.byTestId(buttonTestId).click();

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
        cy.byTestId('uploadDocumentHint').should('be.visible');
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

        // The download itself is one of the GDPR-sensitive reads recorded in the audit trail
        // (issue #3180) - proven here against the real backend, not just a mocked unit test.
        cy.byTestId('history-tab-label').click();
        cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
        cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Dokument');
        cy.byTestId('documents-tab-label').click();

        cy.byTestId('document-0-deleteButton').click();
        cy.byTestId('deletedocument-dialog').should('be.visible');
        cy.byTestId('deletedocument-dialog').within(() => {
          cy.byTestId('okButton').click();
        });

        cy.byTestId('upload-document-panel').should('be.visible');
      });
    });

    it('uploads a signed privacy notice as its own document type', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-PRIVACY_NOTICE').click();
        cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
        cy.byTestId('okButton').click();

        cy.byTestId('document-0-typeText').should('have.text', 'Datenschutzerklärung (unterschrieben)');
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

    it('records viewing a scanner file preview in the audit trail', () => {
      cy.task('clearScannerInbox');
      const scannerFileName = 'scan-e2e-preview-test.pdf';
      cy.task('writeScannerFile', {fileName: scannerFileName, content: '%PDF-1.1 test content'});

      cy.visit('/kunden/detail/100');
      cy.byTestId('documents-tab-label').click();
      cy.byTestId('documentSourceScanner').click();

      // The preview link opens in a new tab (target="_blank"), which Cypress cannot follow -
      // requesting the exact href it points to exercises the same authenticated call a click would.
      cy.byTestId('scannerFilePreview-' + scannerFileName, {timeout: 10000}).should('be.visible');
      cy.byTestId('scannerFilePreview-' + scannerFileName).invoke('attr', 'href').then((href) => cy.request(href as string));

      cy.visit('/aenderungsprotokoll');
      cy.byTestId('audit-filter-entityType').click();
      cy.get('mat-option').contains('Scanner-Datei').click();

      cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
      cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Scanner-Datei');
      // The scanner file's name is the business key here, shown without a "Nr." prefix and with no
      // link (it belongs to no household or user screen).
      cy.byTestId('audit-entry-0-businessKey').should('have.text', scannerFileName);
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

    it('hides the tab from a user without the CUSTOMER_DOCUMENTS permission', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;

        // e2etest2 holds CUSTOMER and nothing else, so it can open the customer but must not see
        // its ID scans / proofs of income - those are a separate, narrower level of access
        // (GDPR G7, issue #3181).
        cy.loginE2ETest2();
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('customerIdText').should('have.text', String(customerId));
        cy.byTestId('documents-tab-label').should('not.exist');
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

  describe('identity header', () => {

    it('shows the customer name, number, validity and household size chips', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('identity-name').should('be.visible').invoke('text').should('not.be.empty');
        cy.byTestId('identity-number').should('contain.text', String(customerId));
        cy.byTestId('validity-chip').should('be.visible').and('contain.text', 'Gültig');
        cy.byTestId('household-size-chip').should('be.visible').and('contain.text', '1 Person');
        cy.byTestId('lock-chip').should('not.exist');
        cy.byTestId('cost-contribution-chip').should('not.exist');
      });
    });

    it('shows the lock chip once the customer is locked, and removes it once unlocked', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('lock-chip').should('not.exist');

        openEditMenu();
        cy.byTestId('lockCustomerButton').click();
        cy.byTestId('lockreason-input-text').type('dummy lockreason');
        cy.byTestId('lock-customer-dialog').within(() => {
          cy.byTestId('okButton').click();
        });

        // the chip appears in the identity header, which the menu interaction has scrolled past
        cy.byTestId('lock-chip').scrollIntoView().should('be.visible').and('contain.text', 'Gesperrt');

        openEditMenu();
        cy.byTestId('unlockCustomerButton').click();

        cy.byTestId('lock-chip').should('not.exist');
      });
    });

    it('shows and badges the pending cost contribution once debt is open', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('cost-contribution-chip').should('be.visible').and('contain.text', 'Unkostenbeitrag offen');
        cy.byTestId('cost-contribution-badge').should('be.visible');

        // belt-and-suspenders, same as the "cost contribution debt" specs above
        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
      });
    });

    // Testdata customer 101's "Kind 3" (person id 1013) is the one additional person seeded with
    // exclude_household = true, so it - and only it - must not count toward the household size chip
    // and must carry the "not in the household" chip on the persons tab.
    it('excludes a person flagged "not in the household" from the size chip and marks them with a chip', () => {
      cy.visit('/kunden/detail/101');

      cy.byTestId('household-size-chip').should('contain.text', '3 Personen');

      cy.byTestId('additionalpersons-tab-label').click();
      cy.byTestId('addperson-2-lastnameText').should('have.text', 'Musterfrau');
      cy.byTestId('addperson-2-excludedChip').should('be.visible').and('contain.text', 'Nicht im Haushalt');
      cy.byTestId('addperson-0-excludedChip').should('not.exist');
      cy.byTestId('addperson-1-excludedChip').should('not.exist');
    });

    it('shows the resulting date on each prolong menu item', () => {
      cy.visit('/kunden/detail/100');

      cy.byTestId('validUntilText').then(($value) => {
        const validDateString = $value.text();
        const expectedThreeMonths = dayjs(validDateString, 'DD.MM.YYYY').add(3, 'months').endOf('day').format('DD.MM.YYYY');

        cy.byTestId('prolongButton').click();
        cy.byTestId('prolongThreeMonthsButton')
          .should('contain.text', '3 Monate')
          .and('contain.text', expectedThreeMonths);
      });
    });

    it('links phone and email as tel:/mailto: and copies the address to the clipboard', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('telephoneNumberText').should('have.attr', 'href').and('match', /^tel:/);
        cy.byTestId('emailText').should('have.attr', 'href').and('match', /^mailto:/);

        cy.byTestId('copy-address-button').click();
        cy.get('.toast-message').should('be.visible').and('contain.text', 'Zwischenablage');
      });
    });

    it('shows a busy state on the print button while a PDF is being generated', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/detail/' + customerId);

        cy.intercept('/api/households/*/generate-pdf**', (req) => {
          req.on('response', (res) => {
            res.setDelay(500);
          });
        }).as('generatePdf');

        cy.byTestId('printMenuButton').click();
        cy.byTestId('printMasterdataButton').click();

        cy.byTestId('printMenuButton').should('contain.text', 'Wird erstellt').and('be.disabled');
        cy.wait('@generatePdf');
        cy.byTestId('printMenuButton').should('contain.text', 'Daten ausdrucken');
      });
    });

    it('shows a note count and relative time on the "Aktuellste Notiz" card', () => {
      cy.visit('/kunden/detail/103');

      cy.byTestId('notes-count').should('be.visible');
      cy.byTestId('note-relative-time').should('be.visible');
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

  // Only the first tab and none of the dialogs exist on the initial render the Lighthouse `pages`
  // sweep grades - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the tabs that are not selected by default', () => {
      cy.visit('/kunden/detail/101');

      cy.byTestId('additionalpersons-tab-label').click();
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('documents-tab-label').click();
      cy.byTestId('upload-document-panel').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    // 132 is the testdata customer with a full history, so the tab renders entries of every
    // household-scoped type rather than an empty state.
    it('has no violations on the Verlauf tab', () => {
      cy.visit('/kunden/detail/132');

      cy.byTestId('history-tab-label').scrollIntoView().click();
      cy.byTestId('audit-entry-list').should('exist');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations in the note dialogs', () => {
      // 103 is the testdata customer with more than one note, so the "all notes" dialog exists
      cy.visit('/kunden/detail/103');

      cy.byTestId('addnote-button').click();
      cy.byTestId('noteHint').should('be.visible');
      cy.checkDialogAccessibility();
      cy.byTestId('cancelButton').click();

      cy.byTestId('showall-notes-button').click();
      cy.checkDialogAccessibility();
    });

    it('has no violations in the overflow menu and its dialogs', () => {
      cy.createDummyCustomer().then((response) => {
        cy.visit('/kunden/detail/' + response.body.data.id);

        cy.byTestId('editCustomerToggleButton').click();
        cy.checkMenuAccessibility();

        cy.byTestId('lockCustomerButton').click();
        cy.byTestId('lock-customer-dialog').should('be.visible');
        cy.checkDialogAccessibility();
        cy.byTestId('lock-customer-dialog').within(() => {
          cy.byTestId('cancelButton').click();
        });

        cy.byTestId('editCustomerToggleButton').click();
        cy.byTestId('deleteCustomerButton').click();
        cy.byTestId('deletecustomer-dialog').should('be.visible');
        cy.checkDialogAccessibility();
      });
    });

    it('has no violations in the cost contribution dialogs', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;

        cy.visit('/kunden/detail/' + customerId);

        cy.byTestId('costContributionButton').scrollIntoView().click();
        cy.byTestId('editCostContributionButton').click();
        cy.byTestId('edit-cost-contribution-dialog').should('be.visible');
        cy.checkDialogAccessibility();
        cy.byTestId('edit-cost-contribution-dialog').within(() => {
          cy.byTestId('amount-input').clear().type('75');
          cy.byTestId('okButton').click();
        });

        cy.byTestId('costContributionButton').scrollIntoView().click();
        cy.byTestId('payCostContributionAmountButton').click();
        cy.byTestId('pay-cost-contribution-dialog').should('be.visible');
        cy.checkDialogAccessibility();
        cy.byTestId('pay-cost-contribution-dialog').within(() => {
          cy.byTestId('cancelButton').click();
        });

        // other specs (e.g. customer-search.cy.ts's "search by cost contribution") count the
        // customers carrying debt, so this one must not be left with any
        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
      });
    });

    it('has no violations on the document delete dialog', () => {
      cy.createDummyCustomer().then((response) => {
        cy.visit('/kunden/detail/' + response.body.data.id);

        cy.byTestId('documents-tab-label').click();
        cy.byTestId('upload-document-panel').should('be.visible');
        cy.byTestId('documentTypeInput').click();
        cy.byTestId('documentTypeInput-option-PROOF_OF_INCOME').click();
        cy.byTestId('documentFileInput').selectFile('cypress/fixtures/documents/test-document.pdf', {force: true});
        cy.byTestId('okButton').click();

        cy.byTestId('document-0-deleteButton').should('be.visible').click();
        cy.byTestId('deletedocument-dialog').should('be.visible');

        cy.checkDialogAccessibility();
      });
    });

  });

});
