import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Cars', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/fahrzeuge');
  });

  it('lists cars', () => {
    cy.byTestId('cars-table').should('exist');
    cy.byTestId('cars-row-0').should('contain.text', 'Nice Car');
  });

  it('creates a new car and stores its license plate in upper case', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addCarButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="licensePlate"]').should('be.visible').type('w-new-' + randomId);
      cy.get('input[formControlName="name"]').type('New Car ' + randomId);
      cy.get('input[formControlName="licensePlate"]').should('have.value', 'W-NEW-' + randomId);
      cy.contains('Speichern').click();

      cy.byTestId('cars-table').should('contain.text', 'New Car ' + randomId);
      cy.byTestId('cars-table').should('contain.text', 'W-NEW-' + randomId);
    });
  });

  it('warns about an existing license plate instead of creating it twice', () => {
    cy.byTestId('addCarButton').click();

    // lower case on purpose - the plate of an existing car is recognized regardless of its case
    cy.get('input[formControlName="licensePlate"]').should('be.visible').type('w-nc-456');

    cy.byTestId('carDuplicateHint').should('be.visible').and('contain.text', 'W-NC-456');
    cy.byTestId('saveNewCarButton').should('be.disabled');
  });

  it('offers to re-activate a deactivated car instead of creating it again', () => {
    cy.byTestId('addCarButton').click();
    cy.get('input[formControlName="licensePlate"]').should('be.visible').type('w-nc-111');

    cy.byTestId('carDuplicateHint').should('be.visible').and('contain.text', 'deaktiviert');
    cy.byTestId('reactivateExistingCarButton').click();

    // 'aktiviert' alone would also match 'deaktiviert', so the opposite outcome has to be ruled out
    cy.get('.toast-message').should('be.visible')
      .and('contain.text', 'aktiviert').and('not.contain.text', 'deaktiviert');
    cy.byTestId('cars-table').should('contain.text', 'W-NC-111');

    // back to how the other cases expect the list, deactivated again
    cy.byTestId('cars-table').contains('tr', 'W-NC-111').within(() => {
      cy.byTestId('deactivateCarButton').click();
    });
    cy.byTestId('inactive-cars').should('contain.text', 'W-NC-111');
  });

  it('shows validation errors and does not submit an invalid new car', () => {
    cy.byTestId('addCarButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="licensePlate"]').should('be.visible').clear();
    cy.contains('Speichern').click();

    cy.byTestId('car-create-dialog').should('be.visible');
    cy.get('input[formControlName="licensePlate"]').should('have.class', 'ng-invalid');
  });

  it('focuses the license plate input when starting an inline edit', () => {
    cy.byTestId('editCarButton-0').click();

    cy.byTestId('carLicensePlateInput-0').should('be.focused');
  });

  it('edits a car inline', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editCarButton-0').click();

      const newName = 'Nice Car Updated ' + randomId;
      cy.byTestId('carNameInput-0').should('be.visible').clear().type(newName);
      cy.byTestId('saveCarButton-0').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      // Cars share a tied sort_order in testdata, so the list is ordered alphabetically by
      // name - renaming can move the edited row past others, so assert against the whole
      // table rather than assuming it stays at row 0 (unlike food-categories, whose testdata
      // pins distinct sort_order values that keep "Backwaren" first regardless of rename).
      cy.byTestId('cars-table').should('contain.text', newName);
    });
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('cars-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editCarButton-0').click();
      cy.byTestId('carNameInput-0').clear().type('Should Not Be Saved');
      cy.byTestId('cancelCarButton-0').click();

      cy.byTestId('cars-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editCarButton-0').click();

      const newName = 'Nice Car Enter ' + randomId;
      cy.byTestId('carNameInput-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('cars-table').should('contain.text', newName);
    });
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('cars-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editCarButton-0').click();
      cy.byTestId('carNameInput-0').clear().type('Should Not Be Saved{esc}');

      cy.byTestId('cars-row-0').should('have.text', originalText);
    });
  });

  it('moves a deactivated car into the deactivated section and back', () => {
    // The plate survives the renames the inline-edit cases above do, so it identifies the row
    // regardless of where sorting by name has put it by now.
    cy.byTestId('cars-row-0').invoke('text').then((rowText) => {
      const plate = /W-[A-Z0-9-]+/.exec(rowText)![0];

      cy.byTestId('cars-table').contains('tr', plate).within(() => {
        cy.byTestId('deactivateCarButton').click();
      });
      cy.get('.toast-message').should('be.visible').and('contain.text', 'deaktiviert');

      // unfolded on its own - a car that just left the working list must not look deleted
      cy.byTestId('inactive-cars').should('be.visible').and('contain.text', plate);
      cy.byTestId('cars-table').should('not.contain.text', plate);

      cy.byTestId('inactive-cars').contains('li', plate).within(() => {
        cy.byTestId('reactivateCarButton').click();
      });
      cy.get('.toast-message').should('be.visible');
      cy.byTestId('cars-table').should('contain.text', plate);
    });
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('cars-table').should('not.be.visible');
    cy.byTestId('cars-cards').should('be.visible');
    cy.byTestId('addCarButton').should('be.visible');

    cy.getAnyRandomNumber().then((randomId) => {
      const newName = 'Car Updated On Phone ' + randomId;

      cy.byTestId('editCarButtonMobile-0').click();
      cy.byTestId('carNameInputMobile-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('cars-cards').should('contain.text', newName);
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('cars-table').should('be.visible');
    cy.byTestId('cars-cards').should('not.be.visible');
    cy.byTestId('addCarButton').should('be.visible');
  });


  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the create dialog is open', () => {
      cy.byTestId('addCarButton').click();

      cy.checkDialogAccessibility();
    });

    it('has no violations while the create dialog warns about an existing plate', () => {
      cy.byTestId('addCarButton').click();
      cy.get('input[formControlName="licensePlate"]').should('be.visible').type('w-nc-111');
      cy.byTestId('carDuplicateHint').should('be.visible');

      cy.checkDialogAccessibility();
    });

    it('has no violations while the deactivated section is unfolded', () => {
      cy.byTestId('toggleInactiveCarsButton').click();
      cy.byTestId('inactive-cars').should('be.visible');

      cy.checkAccessibility('[testid="inactive-cars"]');
    });

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('editCarButton-0').click();
      cy.byTestId('carLicensePlateInput-0').should('be.visible');

      cy.checkAccessibility('[testid="cars-table"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('editCarButtonMobile-0').click();
      cy.byTestId('carNameInputMobile-0').should('be.visible');

      cy.checkAccessibility('[testid="cars-cards"]');
    });

  });

  // Angular CDK's drag-and-drop contributes no keyboard behaviour of its own, so without this the
  // sort order could only be changed with a pointing device (see #3131).
  //
  // Every lookup goes through `cy.get` scoped to the table, and each move waits for its request to
  // land: a reorder re-renders the rows optimistically and then again from the response, so a
  // subject captured before that second render is gone by the time it is used. The table scope
  // also picks the displayed one of the two responsive layouts, which share a testid.
  it('reorders with the keyboard and keeps focus on the moved record', () => {
    const handle = (index: number) =>
      cy.get('[testid="cars-table"] [testid="dragCarHandle-' + index + '"]');

    cy.intercept('POST', '/api/cars/reorder').as('reorder');

    handle(0).invoke('attr', 'aria-label').then((label) => {
      const movedRecord = label!.split(', Position')[0];
      expect(movedRecord).to.contain('Fahrzeug');

      handle(0).focus().trigger('keydown', {key: 'ArrowDown'});
      cy.wait('@reorder');

      handle(1).should(($handle) => {
        const movedLabel = $handle.attr('aria-label')!;
        expect(movedLabel).to.contain(movedRecord);
        expect(movedLabel).to.contain('Position 2 von');
      });
      cy.focused().should('have.attr', 'testid', 'dragCarHandle-1');

      // back where it started, so the order the other cases rely on is unchanged
      handle(1).focus().trigger('keydown', {key: 'ArrowUp'});
      cy.wait('@reorder');

      handle(0).should(($handle) => {
        expect($handle.attr('aria-label')).to.contain(movedRecord);
      });
    });
  });

});
