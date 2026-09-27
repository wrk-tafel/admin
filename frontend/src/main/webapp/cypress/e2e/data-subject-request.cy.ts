import * as path from 'path';
import dayjs from 'dayjs';
import {Gender} from '../support/commands';
import {MAIN_CONTENT} from '../support/accessibility';

const AUSTRIA = {id: 165, name: 'Österreich'};

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

  it('searches across households, user accounts and employees, grouped by type', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      // A dedicated prefix, deliberately not the 'lastname-' every cy.createDummyCustomer()/
      // cy.createDummyUser() fixture across the whole e2e suite shares - the search is fuzzy
      // (strict_word_similarity, see SearchTextSpecs), and by the time a long e2e run has
      // accumulated thousands of dummy households/employees, some unrelated fixture's own
      // 'lastname-<digits>' can cross the similarity threshold against this test's discriminator
      // and inflate the match count (see #3406). This prefix shares no word with any other spec's
      // fixtures, so it can't be confused with them regardless of how much data has accumulated.
      const discriminator = 'dsr-discriminator-' + randomId;

      cy.createCustomer({
        firstname: 'firstname-' + randomId,
        lastname: discriminator,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        telephoneNumber: '0123456789',
        email: 'firstname.lastname@test.com',
        employer: 'employer-' + randomId,
        country: AUSTRIA,
        income: 1000,
        incomeDue: dayjs().add(30, 'days').toDate(),
        address: {
          street: 'street-' + randomId,
          houseNumber: '1A',
          city: 'city-' + randomId,
          postalCode: 1234
        },
        validUntil: dayjs().add(1, 'year').toDate()
      }).then(() => {
        cy.request('POST', '/api/employees', {
          personnelNumber: 'DSR-' + randomId,
          firstname: 'Driver',
          lastname: discriminator
        });
        const password = 'Dsr-' + randomId + '-Password1';
        cy.createUser({
          username: 'dsr-user-' + randomId,
          personnelNumber: 'DSR-USER-' + randomId,
          firstname: 'Account',
          lastname: discriminator,
          enabled: true,
          password,
          passwordRepeat: password,
          passwordChangeRequired: false,
          permissions: []
        });

        cy.byTestId('data-subject-request-search-input').type(discriminator);

        cy.byTestId('data-subject-request-search-announcement').should('contain.text', '3 Treffer');
        cy.contains('h3', 'Kunde').should('be.visible');
        cy.contains('h3', 'Benutzerkonto').should('be.visible');
        cy.contains('h3', 'Mitarbeiter').should('be.visible');
        cy.get(`[testid="data-subject-request-match"]:contains("${discriminator}")`).should('have.length', 3);
      });
    });
  });

  // A user account and an employee are separate records with no link, so the same person shows up
  // under both headings - one match each, nothing is hidden behind the other.
  it('lists a person once as a user account and once as an employee', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DSR-BOTH-' + randomId;
      const password = 'Dsr-' + randomId + '-Password1';

      cy.createUser({
        username: 'dsr-both-' + randomId,
        personnelNumber,
        firstname: 'Both',
        lastname: 'Records' + randomId,
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired: false,
        permissions: []
      });
      cy.request('POST', '/api/employees', {personnelNumber, firstname: 'Both', lastname: 'Records' + randomId});

      cy.byTestId('data-subject-request-search-input').type(personnelNumber);

      cy.contains('h3', 'Benutzerkonto').should('be.visible');
      cy.contains('h3', 'Mitarbeiter').should('be.visible');
      // a user match shows the username as its key and an employee match the personnel number, so the
      // two are told apart by the name they share
      cy.get(`[testid="data-subject-request-match"]:contains("Records${randomId}")`).should('have.length', 2);
    });
  });

  // '00000' is the personnel number of the e2etest fixture user, who has no employee record.
  it('finds a user account by its own personnel number, without an employee match', () => {
    cy.byTestId('data-subject-request-search-input').type('00000');

    cy.contains('h3', 'Benutzerkonto').should('be.visible');
    cy.contains('[testid="data-subject-request-match"]', 'e2etest').should('be.visible');
    cy.contains('h3', 'Mitarbeiter').should('not.exist');
  });

  it('shows a hint when an area\'s results were truncated at the per-area cap', () => {
    cy.intercept('POST', '/api/data-subject-requests/search', {
      items: [{type: 'CUSTOMER', id: 1, businessKey: '1', name: 'Truncated Example'}],
      truncated: true
    }).as('truncatedSearch');

    cy.byTestId('data-subject-request-search-input').type('anything');
    cy.wait('@truncatedSearch');

    cy.byTestId('data-subject-request-truncated-hint').should('be.visible');
    cy.byTestId('data-subject-request-search-announcement').should('contain.text', 'weitere Treffer werden nicht angezeigt');
  });

  it('reports a not-found match by name rather than only a count on delete', () => {
    cy.intercept('POST', '/api/data-subject-requests/search', {
      items: [{type: 'EMPLOYEE', id: 1, businessKey: 'DSR-GONE', name: 'Already Gone'}],
      truncated: false
    }).as('search');
    cy.intercept('POST', '/api/data-subject-requests/delete', {
      results: [{match: {type: 'EMPLOYEE', id: 1}, outcome: 'NOT_FOUND'}]
    }).as('delete');

    cy.byTestId('data-subject-request-search-input').type('DSR-GONE');
    cy.wait('@search');
    selectMatch('DSR-GONE');
    cy.byTestId('data-subject-request-delete').click();
    cy.byTestId('okButton').click();
    cy.wait('@delete');

    cy.get('.toast-message').should('be.visible').and('contain.text', 'Already Gone (DSR-GONE)');
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
