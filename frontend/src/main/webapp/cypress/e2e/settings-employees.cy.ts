import * as path from 'path';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Employees', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/mitarbeiter');
  });

  it('lists employees', () => {
    cy.byTestId('employees-table').should('exist');
    cy.byTestId('employees-row-0').should('exist');
  });

  it('paginates through the employee list', () => {
    // The testdata seeds exactly 10 employees, which is exactly the default page size - so on a
    // freshly migrated database there is only ever one page and the next-page button is disabled.
    // Create a dedicated employee first so a second page is guaranteed to exist, rather than
    // relying on leftovers from earlier tests/runs.
    cy.getAnyRandomNumber().then((randomId) => {
      cy.request({
        method: 'POST',
        url: '/api/employees',
        body: {
          personnelNumber: 'PAGE-' + randomId,
          firstname: 'Pagination',
          lastname: 'Fixture ' + randomId
        }
      });
      cy.reload();

      cy.get('.tafel-paginator-responsive').should('have.length', 2);
      cy.byTestId('employees-paginator').should('exist');

      // The row testid exists in both responsive branches (desktop table and mobile card list), so
      // scope the lookup to the table - an unscoped one concatenates the displayed row's text with
      // the hidden branch's copy of it.
      cy.byTestId('employees-table').find('[testid="employees-row-0"]').invoke('text').then((firstPageText) => {
        cy.byTestId('employees-paginator').find('.mat-mdc-paginator-navigation-next').click();

        cy.byTestId('employees-table').find('[testid="employees-row-0"]').invoke('text').should('not.equal', firstPageText);
      });
    });
  });

  it('searches while the search input is typed, without a search button', () => {
    cy.byTestId('searchEmployeeButton').should('not.exist');

    cy.byTestId('employeeSearchInput').type('Fahrer');

    cy.byTestId('employees-table').should('contain.text', 'Fahrer');
    cy.byTestId('employees-table').should('not.contain.text', 'Scanner');
    cy.byTestId('employeesSearchAnnouncement').should('contain.text', 'Mitarbeiter gefunden');
  });

  it('says that employees can always be deleted', () => {
    cy.byTestId('employeesCaption').should('contain.text', 'jederzeit gelöscht werden');
  });

  it('shows which employees a user account references', () => {
    // '00000' is the e2e login user's own employee record (user 100), '02000' a driver with no
    // account of their own - the two states the column has to tell apart.
    cy.byTestId('employeeSearchInput').type('00000');
    cy.byTestId('employees-table').should('contain.text', 'E2E');
    cy.byTestId('employeeUserAccountLink-0').should('contain.text', 'e2etest')
      .and('have.attr', 'href', '/benutzer/detail/100');

    cy.byTestId('employeeSearchInput').clear().type('02000');
    cy.byTestId('employees-table').should('contain.text', 'Fahrer');
    cy.byTestId('employeeNoUserAccount-0').should('be.visible');
  });

  it('creates a new employee', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addEmployeeButton').click();

      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type('PN-' + randomId);
      cy.byTestId('employeeCreateFirstnameInput').type('New');
      cy.byTestId('employeeCreateLastnameInput').type('Employee ' + randomId);
      cy.byTestId('employeeCreateSaveButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');
    });
  });

  it('reports a personnel number already given out and opens the employee holding it', () => {
    cy.byTestId('addEmployeeButton').click();

    cy.byTestId('employeeCreateHint').should('contain.text', 'Warenerfassung');
    cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type('02000');
    cy.byTestId('employeeCreateFirstnameInput').type('Duplicate');
    cy.byTestId('employeeCreateLastnameInput').type('Attempt');

    cy.byTestId('employeeCreateDuplicateHint').should('contain.text', 'Fahrer 1');
    cy.byTestId('employeeCreateSaveButton').click();
    cy.byTestId('employee-create-dialog').should('be.visible');

    cy.byTestId('employeeCreateOpenDuplicateButton').click();

    cy.byTestId('employee-create-dialog').should('not.exist');
    cy.byTestId('employeeSearchInput').should('have.value', '02000');
    cy.byTestId('employeePersonnelNumberInput-0').should('have.value', '02000');
  });

  it('refuses to save an inline edit onto an already given out personnel number', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DUP-' + randomId;

      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type(personnelNumber);
      cy.byTestId('employeeCreateFirstnameInput').type('Duplicate');
      cy.byTestId('employeeCreateLastnameInput').type('Edit');
      cy.byTestId('employeeCreateSaveButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');

      cy.byTestId('employeeSearchInput').type(personnelNumber);
      cy.byTestId('employees-row-0').should('contain.text', personnelNumber);

      cy.byTestId('editEmployeeButton-0').click();
      cy.byTestId('employeePersonnelNumberInput-0').should('be.visible').clear().type('02000');

      cy.byTestId('employeeDuplicateHint-0').should('contain.text', 'Fahrer 1');
      cy.byTestId('saveEmployeeButton-0').should('be.disabled');
    });
  });

  it('shows validation errors and does not submit an invalid new employee', () => {
    cy.byTestId('addEmployeeButton').click();

    cy.byTestId('employeeCreateSaveButton').click();

    cy.byTestId('employee-create-dialog').should('be.visible');
    cy.byTestId('employeeCreatePersonnelNumberInput').should('have.class', 'ng-invalid');
  });

  it('focuses the personnel number input when starting an inline edit', () => {
    cy.byTestId('editEmployeeButton-0').click();

    cy.byTestId('employeePersonnelNumberInput-0').should('be.focused');
  });

  it('edits an employee inline', () => {
    // Uses a dedicated, freshly-created employee rather than editing row 0 directly - row 0 is
    // deterministically the lowest-id employee, which is a shared fixture (the logged-in e2e
    // user, also relied on as a driver by other specs), and editing it would corrupt that fixture.
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'EDIT-' + randomId;

      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type(personnelNumber);
      cy.byTestId('employeeCreateFirstnameInput').type('Edit');
      cy.byTestId('employeeCreateLastnameInput').type('Original');
      cy.byTestId('employeeCreateSaveButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');

      cy.byTestId('employeeSearchInput').type(personnelNumber);
      cy.byTestId('employees-row-0').should('contain.text', personnelNumber);

      cy.byTestId('editEmployeeButton-0').click();

      const newLastname = 'Updated ' + randomId;
      cy.byTestId('employeeLastnameInput-0').should('be.visible').clear().type(newLastname);
      cy.byTestId('saveEmployeeButton-0').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('employees-table').should('contain.text', newLastname);
    });
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('employees-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editEmployeeButton-0').click();
      cy.byTestId('employeeLastnameInput-0').clear().type('Should Not Be Saved');
      cy.byTestId('cancelEmployeeButton-0').click();

      cy.byTestId('employees-row-0').should('have.text', originalText);
    });
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('employees-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editEmployeeButton-0').click();
      cy.byTestId('employeeLastnameInput-0').clear().type('Should Not Be Saved{esc}');

      cy.byTestId('employees-row-0').should('have.text', originalText);
    });
  });

  it('keeps the employee when the delete confirmation is cancelled', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DEL-CANCEL-' + randomId;

      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type(personnelNumber);
      cy.byTestId('employeeCreateFirstnameInput').type('Delete');
      cy.byTestId('employeeCreateLastnameInput').type('Cancel');
      cy.byTestId('employeeCreateSaveButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');

      cy.byTestId('employeeSearchInput').type(personnelNumber);
      cy.byTestId('employees-row-0').should('contain.text', personnelNumber);
      cy.byTestId('deleteEmployeeButton-0').click();

      cy.byTestId('employee-delete-confirm-dialog').should('be.visible');
      cy.byTestId('cancelButton').click();

      cy.byTestId('employees-table').should('contain.text', personnelNumber);
    });
  });

  it('deletes an employee that has no linked user account', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'DEL-OK-' + randomId;

      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type(personnelNumber);
      cy.byTestId('employeeCreateFirstnameInput').type('Delete');
      cy.byTestId('employeeCreateLastnameInput').type('Ok');
      cy.byTestId('employeeCreateSaveButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');

      cy.byTestId('employeeSearchInput').type(personnelNumber);
      cy.byTestId('employees-row-0').should('contain.text', personnelNumber);
      cy.byTestId('deleteEmployeeButton-0').click();
      cy.byTestId('okButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
      cy.byTestId('employees-table').should('not.contain.text', personnelNumber);
    });
  });

  it('refuses to delete an employee that still has a linked user account', () => {
    // '00000' is the e2e login user's own employee record (user 100) - deleting it is always
    // rejected, so this is safe to run against the shared fixture without corrupting it for
    // other specs.
    cy.byTestId('employeeSearchInput').type('00000');
    cy.byTestId('employees-row-0').should('contain.text', '00000');
    cy.byTestId('deleteEmployeeButton-0').click();
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'Benutzerkonto');
    cy.byTestId('employees-table').should('contain.text', '00000');
  });

  // The GDPR Art. 15/20 data takeout (issue #3394) - the export path for an employee with no
  // linked user account, since UserApiService's export endpoints have no userId to key off for
  // one. '02000' is a driver with no account of their own (see 'shows which employees a user
  // account references' above).
  it('exports an employee\'s data (GDPR takeout) and downloads a ZIP', () => {
    cy.byTestId('employeeSearchInput').type('02000');
    cy.byTestId('employees-row-0').should('contain.text', 'Fahrer');

    cy.byTestId('exportEmployeeButton-0').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'mitarbeiterdaten-02000.zip');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string) => expect(buffer.length).to.be.gt(1000));

    // The export is one of the GDPR-sensitive reads recorded in the audit trail (issue #3180).
    cy.visit('/aenderungsprotokoll');
    cy.byTestId('audit-filter-entityType').click();
    cy.get('mat-option').contains('Mitarbeiter').click();

    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Mitarbeiter');
  });

  // An employee with a linked user account already has a complete export via that account's own
  // detail page (username, permissions, login history *and* this employee's personnel number/name)
  // - a second, less complete export here would be a duplicate document for the same person.
  it('does not offer the export button for an employee with a linked user account', () => {
    cy.byTestId('employeeSearchInput').type('00000');
    cy.byTestId('employees-row-0').should('contain.text', '00000');
    cy.byTestId('exportEmployeeButton-0').should('not.exist');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('employees-table').should('not.be.visible');
    cy.byTestId('employees-cards').should('be.visible');
    cy.byTestId('addEmployeeButton').should('be.visible');

    // Uses a dedicated, freshly-created employee rather than editing row 0 directly - see the
    // 'edits an employee inline' test above for why (row 0 may be the shared e2e login fixture).
    cy.getAnyRandomNumber().then((randomId) => {
      const personnelNumber = 'PHONE-' + randomId;

      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type(personnelNumber);
      cy.byTestId('employeeCreateFirstnameInput').type('Phone');
      cy.byTestId('employeeCreateLastnameInput').type('Original');
      cy.byTestId('employeeCreateSaveButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');

      cy.byTestId('employeeSearchInput').type(personnelNumber);
      cy.byTestId('employees-cards').should('contain.text', personnelNumber);

      const newLastname = 'Updated On Phone ' + randomId;

      cy.byTestId('editEmployeeButtonMobile-0').click();
      cy.byTestId('employeeLastnameInputMobile-0').should('be.visible').clear().type(newLastname + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('employees-cards').should('contain.text', newLastname);
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('employees-table').should('be.visible');
    cy.byTestId('employees-cards').should('not.be.visible');
    cy.byTestId('addEmployeeButton').should('be.visible');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the create dialog is open', () => {
      cy.byTestId('addEmployeeButton').click();

      cy.checkDialogAccessibility();
    });

    it('has no violations while the create dialog reports a duplicate', () => {
      cy.byTestId('addEmployeeButton').click();
      cy.byTestId('employeeCreatePersonnelNumberInput').should('be.visible').type('02000');
      cy.byTestId('employeeCreateDuplicateHint').should('be.visible');

      cy.checkDialogAccessibility();
    });

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('editEmployeeButton-0').click();
      cy.byTestId('employeePersonnelNumberInput-0').should('be.visible');

      cy.checkAccessibility('[testid="employees-table"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('editEmployeeButtonMobile-0').click();
      cy.byTestId('employeeLastnameInputMobile-0').should('be.visible');

      cy.checkAccessibility('[testid="employees-cards"]');
    });

    it('has no violations while the delete confirmation dialog is open', () => {
      cy.byTestId('deleteEmployeeButton-0').click();

      cy.checkDialogAccessibility();
    });

  });

});
