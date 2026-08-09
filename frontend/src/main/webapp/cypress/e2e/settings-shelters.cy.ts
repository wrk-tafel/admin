import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Shelters', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/notschlafstellen');
  });

  it('lists shelters', () => {
    cy.byTestId('shelters-table').should('exist');
    cy.byTestId('shelters-row-0').should('contain.text', 'Shelter');
  });

  it('opens details dialog', () => {
    cy.byTestId('viewShelterButton').first().click();

    cy.byTestId('shelter-details-dialog').should('be.visible')
      .and('contain.text', 'Shelter')
      .and('contain.text', 'Erdberg')
      .and('contain.text', 'Anz. Personen');
    cy.contains('Schließen').click();
  });

  it('creates a new shelter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addShelterButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="name"]').should('be.visible').type('New Shelter ' + randomId);
      cy.get('input[formControlName="addressStreet"]').should('be.visible').type('New Street');
      cy.get('input[formControlName="addressHouseNumber"]').type('10');
      cy.get('input[formControlName="addressPostalCode"]').type('1234');
      cy.get('input[formControlName="addressCity"]').type('City');
      cy.get('input[formControlName="personsCount"]').type('20');
      // add a contact
      cy.contains('Kontakt hinzufügen').click();
      cy.get('input[formControlName="firstname"]').last().type('Anna');
      cy.get('input[formControlName="lastname"]').last().type('Smith');
      cy.get('input[formControlName="phone"]').last().type('0999');
      cy.contains('Speichern').click();
    });
  });

  it('edits a shelter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      // open edit for row 0
      cy.get('[testid^="searchresult-edituser-button-"]').first().click();

      // Dialog fields are rendered in the overlay; target visible inputs instead
      const newName = 'A Shelter Updated ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('shelters-row-0').should('contain.text', newName);
    });
  });

  it('toggles shelter visibility', () => {
    cy.byTestId('enableShelterButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
  });

  it('shows validation errors and does not submit invalid shelter', () => {
    cy.byTestId('addShelterButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="name"]').should('be.visible').clear();
    cy.contains('Speichern').click();

    cy.byTestId('shelter-edit-dialog').should('be.visible');
    cy.get('input[formControlName="name"]').should('have.class', 'ng-invalid');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('shelters-table').should('not.be.visible');
    cy.byTestId('shelters-cards').should('be.visible').and('contain.text', 'Shelter');
    cy.byTestId('addShelterButton').should('be.visible');

    cy.getAnyRandomNumber().then((randomId) => {
      // Pick the first enabled shelter's edit button - the 'toggles shelter visibility' test above
      // may have left another shelter disabled (its edit button is disabled while so).
      cy.get('[testid^="searchresult-edituser-button-"]:not(:disabled)').filterDisplayed().first().click();

      const newName = 'A Shelter Updated On Phone ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('shelters-cards').should('contain.text', newName);
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('shelters-table').should('be.visible');
    cy.byTestId('shelters-cards').should('not.be.visible');
    cy.byTestId('addShelterButton').should('be.visible');
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
      cy.get('[testid="shelters-table"] [testid="dragShelterHandle-' + index + '"]');

    cy.intercept('POST', '/api/shelters/reorder').as('reorder');

    handle(0).invoke('attr', 'aria-label').then((label) => {
      const movedRecord = label!.split(', Position')[0];
      expect(movedRecord).to.contain('Notschlafstelle');

      handle(0).focus().trigger('keydown', {key: 'ArrowDown'});
      cy.wait('@reorder');

      handle(1).should(($handle) => {
        const movedLabel = $handle.attr('aria-label')!;
        expect(movedLabel).to.contain(movedRecord);
        expect(movedLabel).to.contain('Position 2 von');
      });
      cy.focused().should('have.attr', 'testid', 'dragShelterHandle-1');

      // back where it started, so the order the other cases rely on is unchanged
      handle(1).focus().trigger('keydown', {key: 'ArrowUp'});
      cy.wait('@reorder');

      handle(0).should(($handle) => {
        expect($handle.attr('aria-label')).to.contain(movedRecord);
      });
    });
  });

});
