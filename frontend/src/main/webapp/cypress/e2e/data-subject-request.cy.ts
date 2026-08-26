import * as path from 'path';
import {MAIN_CONTENT} from '../support/accessibility';

// Clicking the mat-checkbox host element itself is unreliable once its label text is long enough
// to shift the element's center away from the actual checkbox glyph - the native input underneath
// is the one target `mat-checkbox` always wires its toggle to.
function selectMatch(text: string) {
  cy.contains('[testid="data-subject-request-match"]', text).find('input[type="checkbox"]').click({force: true});
}

describe('Data Subject Request', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/datenauskunft');
  });

  it('shows a hint below the minimum search length and an empty state for no matches', () => {
    cy.byTestId('data-subject-request-search-input').type('x');
    cy.byTestId('data-subject-request-hint').should('be.visible');

    cy.byTestId('data-subject-request-search-input').clear().type('no-such-entry-anywhere-xyz');
    cy.byTestId('data-subject-request-hint').should('not.exist');
    cy.byTestId('data-subject-request-empty').should('contain.text', 'Keine Treffer');
  });

  it('searches across households and employees without an account, grouped by type', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.createDummyCustomer().then((customerResponse) => {
        // The household's own randomized lastname doubles as the shared search term - the
        // employee below is given the exact same one, so a single search is guaranteed to hit
        // both without depending on any other test's or testdata's fixtures.
        const discriminator = customerResponse.body.data.lastname;

        cy.request('POST', '/api/employees', {
          personnelNumber: 'DSR-' + randomId,
          firstname: 'NoAccount',
          lastname: discriminator
        });

        cy.byTestId('data-subject-request-search-input').type(discriminator);

        cy.byTestId('data-subject-request-search-announcement').should('contain.text', '2 Treffer');
        cy.contains('h3', 'Kunde').should('be.visible');
        cy.contains('h3', 'Mitarbeiter ohne Konto').should('be.visible');
        cy.get(`[testid="data-subject-request-match"]:contains("${discriminator}")`).should('have.length', 2);
      });
    });
  });

  // '00000' is the e2e login user's own employee record (user 100, linked account 'e2etest') - the
  // same fixture settings-employees.cy.ts uses to prove the reverse (no export button once linked).
  it('does not list an employee under "Mitarbeiter ohne Konto" once a user account is linked', () => {
    cy.byTestId('data-subject-request-search-input').type('00000');

    cy.contains('h3', 'Benutzerkonto').should('be.visible');
    cy.contains('h3', 'Mitarbeiter ohne Konto').should('not.exist');
    cy.contains('[testid="data-subject-request-match"]', 'e2etest').should('be.visible');
  });

  it('keeps a match listed when the delete confirmation is cancelled', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DSR-CANCEL-' + randomId;
      cy.request('POST', '/api/employees', {personnelNumber, firstname: 'Cancel', lastname: 'DataSubject'});

      cy.byTestId('data-subject-request-search-input').type(personnelNumber);
      selectMatch(personnelNumber);
      cy.byTestId('data-subject-request-delete').click();

      cy.byTestId('data-subject-request-delete-confirm-dialog').should('be.visible');
      cy.byTestId('cancelButton').click();

      cy.contains('[testid="data-subject-request-match"]', personnelNumber).should('exist');
    });
  });

  it('deletes a selected match and removes it from the results', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DSR-DELETE-' + randomId;
      cy.request('POST', '/api/employees', {personnelNumber, firstname: 'Delete', lastname: 'DataSubject'});

      cy.byTestId('data-subject-request-search-input').type(personnelNumber);
      selectMatch(personnelNumber);
      cy.byTestId('data-subject-request-delete').click();
      cy.byTestId('okButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
      cy.byTestId('data-subject-request-empty').should('be.visible');
    });
  });

  it('exports a selected household as the combined GDPR data takeout ZIP', () => {
    cy.createDummyCustomer().then((response) => {
      const lastname = response.body.data.lastname;

      cy.byTestId('data-subject-request-search-input').type(lastname);
      selectMatch(lastname);
      cy.byTestId('data-subject-request-export').click();

      const downloadsFolder = Cypress.config('downloadsFolder');
      const downloadedFilename = path.join(downloadsFolder, 'datenauskunft.zip');

      // Well past the ~22 bytes of an empty archive - the exact per-entry content (folder-prefixed
      // household export) is covered by the backend unit test.
      cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
        .should((buffer: string) => expect(buffer.length).to.be.gt(1000));
    });
  });

  describe('accessibility', () => {

    it('has no violations on the results list', () => {
      cy.byTestId('data-subject-request-search-input').type('00000');
      cy.byTestId('data-subject-request-results').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations while the delete confirmation dialog is open', () => {
      cy.byTestId('data-subject-request-search-input').type('00000');
      selectMatch('e2etest');
      cy.byTestId('data-subject-request-delete').click();

      cy.checkDialogAccessibility();
    });

  });

});
