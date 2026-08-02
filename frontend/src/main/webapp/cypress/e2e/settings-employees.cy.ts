import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Employees', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/mitarbeiter');
  });

  it('lists employees', () => {
    cy.byTestId('employees-table').should('exist');
    cy.byTestId('employees-row-0').should('exist');
  });

  it('paginates through the employee list', () => {
    cy.byTestId('employees-paginator').should('exist');
    cy.byTestId('employees-row-0').invoke('text').then((firstPageText) => {
      cy.byTestId('employees-paginator').find('.mat-mdc-paginator-navigation-next').click();

      cy.byTestId('employees-row-0').invoke('text').should('not.equal', firstPageText);
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

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('employees-table').should('exist');
      cy.byTestId('addEmployeeButton').should('be.visible');
    });
  });

});
