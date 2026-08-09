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

  it('creates a new car', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addCarButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="licensePlate"]').should('be.visible').type('W-NEW-' + randomId);
      cy.get('input[formControlName="name"]').type('New Car ' + randomId);
      cy.contains('Speichern').click();

      cy.byTestId('cars-table').should('contain.text', 'New Car ' + randomId);
    });
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

  it('toggles car visibility', () => {
    cy.byTestId('enableCarButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('cars-table').should('not.be.visible');
    cy.byTestId('cars-cards').should('be.visible');
    cy.byTestId('addCarButton').should('be.visible');

    // The 'toggles car visibility' test above may have left row 0 disabled (its edit button is
    // disabled for disabled cars) - re-enable it first if needed so editing below can proceed.
    cy.byTestId('editCarButtonMobile-0').then(($btn) => {
      if ($btn.is(':disabled')) {
        cy.byTestId('disableCarButton').filterDisplayed().first().click();
        cy.get('.toast-message').should('be.visible');
      }
    });

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


  // Angular CDK's drag-and-drop contributes no keyboard behaviour of its own, so without this the
  // sort order could only be changed with a pointing device (see #3131).
  //
  // Every lookup goes through `cy.get` scoped to the table - the reorder re-renders the rows twice
  // (optimistically, then again from the response), so a subject captured up front detaches, and
  // only a re-queryable chain survives that. The table scope also picks the displayed one of the
  // two responsive layouts, which both carry the same testid.
  it('reorders with the keyboard and keeps focus on the moved record', () => {
    const handle = (index: number) => cy.get('[testid="cars-table"] [testid="dragCarHandle-' + index + '"]');

    handle(0).invoke('attr', 'aria-label').then((label) => {
      const movedRecord = label!.split(', Position')[0];
      expect(movedRecord).to.contain('Fahrzeug');

      handle(0).focus().trigger('keydown', {key: 'ArrowDown'});

      handle(1).should(($handle) => {
        const movedLabel = $handle.attr('aria-label')!;
        expect(movedLabel).to.contain(movedRecord);
        expect(movedLabel).to.contain('Position 2 von');
      });
      cy.focused().should('have.attr', 'testid', 'dragCarHandle-1');

      // back where it started, so the order the other cases rely on is unchanged
      handle(1).focus().trigger('keydown', {key: 'ArrowUp'});
      handle(0).should(($handle) => {
        expect($handle.attr('aria-label')).to.contain(movedRecord);
      });
    });
  });

});
