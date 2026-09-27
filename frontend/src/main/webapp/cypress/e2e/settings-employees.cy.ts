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

  it('sorts by clicking a column header, replacing the default order', () => {
    // Waits out the page's own initial (unsorted) load first - otherwise it can still be in
    // flight when the intercept below is registered, and the click-triggered request race with it.
    cy.byTestId('employees-row-0').should('exist');

    cy.intercept('POST', '/api/employees/search').as('sortedEmployees');
    cy.contains('th', 'Nachname').click();
    cy.wait('@sortedEmployees').its('request.body').should('deep.include', {sortBy: 'lastname', sortDirection: 'asc'});

    cy.contains('th', 'Nachname').click();
    cy.wait('@sortedEmployees').its('request.body').should('deep.include', {sortBy: 'lastname', sortDirection: 'desc'});
  });

  it('paginates through the employee list', () => {
    // The testdata seeds only two employees (the drivers '02000' and '02100'), far below the
    // default page size of 10 - so on a freshly migrated database there is only ever one page and
    // the next-page button is disabled. Create enough dedicated employees first that a second page
    // is guaranteed to exist, rather than relying on leftovers from earlier tests/runs.
    cy.getAnyRandomNumber().then((randomId) => {
      Cypress._.times(9, (index) => {
        cy.request({
          method: 'POST',
          url: '/api/employees',
          body: {
            personnelNumber: 'PAGE-' + randomId + '-' + index,
            firstname: 'Pagination',
            lastname: 'Fixture ' + randomId + '-' + index
          }
        });
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
    cy.byTestId('employeesCaption').should('contain.text', 'jederzeit gelöscht werden')
      .and('not.contain.text', 'muss dieses zuerst entfernt werden');
  });

  // Users and employees are separate records with no link: the list shows the employees alone,
  // and the e2e login user has no employee record.
  it('lists only the employees, with no user account column', () => {
    cy.contains('th', 'Benutzerkonto').should('not.exist');
    cy.byTestId('employees-table').should('not.contain.text', 'Benutzerkonto');

    cy.byTestId('employeeSearchInput').type('02000');
    cy.byTestId('employees-table').should('contain.text', 'Fahrer');

    cy.byTestId('employeeSearchInput').clear().type('00000');
    cy.byTestId('employeesSearchAnnouncement').should('have.text', '0 Mitarbeiter gefunden');
    cy.byTestId('employees-row-0').should('not.exist');
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
    // deterministically the lowest-id employee, which is a shared fixture (a driver other specs
    // rely on), and editing it would corrupt that fixture.
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

  it('deletes an employee', () => {
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

      // what happens to references is said up front, and no account blocks the deletion
      cy.byTestId('employee-delete-confirm-dialog').should('be.visible');
      cy.byTestId('message').should('contain.text', 'Mitarbeiter gelöscht').and('not.contain.text', 'Benutzerkonto');
      cy.byTestId('okButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
      cy.byTestId('employees-table').should('not.contain.text', personnelNumber);
    });
  });

  // An employee and a user account holding the same personnel number are two unrelated records:
  // deleting the employee is never refused and leaves the account alone.
  it('deletes an employee without touching a user account with the same personnel number', () => {
    cy.createDummyUser().then((userResponse) => {
      const user = userResponse.body;

      cy.request('POST', '/api/employees', {
        personnelNumber: user.personnelNumber,
        firstname: user.firstname,
        lastname: user.lastname
      });
      cy.reload();

      cy.byTestId('employeeSearchInput').type(user.personnelNumber);
      cy.byTestId('employees-row-0').should('contain.text', user.personnelNumber);
      cy.byTestId('deleteEmployeeButton-0').click();
      cy.byTestId('okButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
      cy.byTestId('employees-table').should('not.contain.text', user.personnelNumber);

      cy.request('GET', '/api/users/' + user.id).its('status').should('eq', 200);
    });
  });

  // The GDPR Art. 15/20 data takeout (issue #3394) - the export path of an employee, separate
  // from a user account's own export. '02000' is one of the two seeded drivers.
  it('exports an employee\'s data (GDPR takeout) and downloads a ZIP', () => {
    cy.byTestId('employeeSearchInput').type('02000');
    cy.byTestId('employees-row-0').should('contain.text', 'Fahrer');

    cy.byTestId('exportEmployeeButton-0').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'mitarbeiterdaten-02000.zip');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string) => expect(buffer.length).to.be.gt(1000));

    // The export is one of the GDPR-sensitive reads recorded in the audit trail (issue #3180).
    cy.visit('/zugriffsprotokoll');
    cy.byTestId('audit-filter-entityType').click();
    cy.get('mat-option').contains('Mitarbeiter').click();

    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Mitarbeiter');
  });

  // Every employee has an export - there is no user account that could stand in for it.
  it('offers the export button for every employee', () => {
    cy.byTestId('employeeSearchInput').type('0');
    cy.byTestId('employees-row-1').should('exist');

    cy.byTestId('employees-table').find('[testid^="exportEmployeeButton-"]').should('have.length.at.least', 2);
  });

  // The Art. 13 GDPR privacy notice for staff (issue #3429) - a generic download, no employee
  // reference needed, so an admin can hand it to someone with no user account of their own.
  it('downloads the staff privacy notice as a PDF', () => {
    cy.byTestId('downloadStaffPrivacyNoticeButton').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'datenschutzerklaerung-mitarbeiter.pdf');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string) => expect(buffer.length).to.be.gt(1000));
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('employees-table').should('not.be.visible');
    cy.byTestId('employees-cards').should('be.visible');
    cy.byTestId('addEmployeeButton').should('be.visible');

    // Uses a dedicated, freshly-created employee rather than editing row 0 directly - see the
    // 'edits an employee inline' test above for why (row 0 is a shared driver fixture).
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
