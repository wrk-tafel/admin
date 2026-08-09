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

  it('searches for an employee', () => {
    cy.byTestId('employeeSearchInput').type('Driver');
    cy.byTestId('searchEmployeeButton').click();

    cy.byTestId('employees-table').should('contain.text', 'Driver');
    cy.byTestId('employees-table').should('not.contain.text', 'Scanner');
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
      cy.byTestId('searchEmployeeButton').click();
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
      cy.byTestId('searchEmployeeButton').click();
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

  });

});
