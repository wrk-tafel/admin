import {PHONE_VIEWPORT} from '../support/viewports';

describe('Settings - Shelters', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/notschlafstellen');
  });

  it('lists shelters', () => {
    cy.byTestId('shelters-list').should('exist');
    cy.byTestId('shelters-row-0').should('contain.text', 'Shelter');
    cy.byTestId('shelters-summary').should('contain.text', 'aktiv');
    cy.byTestId('shelters-order-hint').should('contain.text', 'Tagesbericht');
  });

  it('shows the address and the contacts of a shelter only once it is expanded', () => {
    cy.byTestId('shelter-details-0').should('not.be.visible');

    cy.byTestId('shelters-row-0').find('[testid^="shelters-toggle-"]').click();

    cy.byTestId('shelter-details-0').should('be.visible')
      .and('contain.text', 'Erdberg')
      .and('contain.text', 'Anz. Personen');

    // a contact's phone number is dialable straight from the list
    cy.byTestId('shelter-details-0').find('a[href^="tel:"]').should('exist');
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

      cy.contains('.toast-message', 'erstellt').should('be.visible');
      cy.byTestId('shelters-list').should('contain.text', 'New Shelter ' + randomId);
    });
  });

  it('edits a shelter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      // The edit button sits in the collapsed header row, so editing needs no expanding. A disabled
      // shelter's button is disabled, hence the first enabled one rather than plainly the first.
      cy.get('[testid^="editShelterButton-"]:not(:disabled)').first().click();

      // Dialog fields are rendered in the overlay; target visible inputs instead
      const newName = 'A Shelter Updated ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('shelters-list').should('contain.text', newName);
    });
  });

  it('deactivates a shelter and finds it again through the status filter', () => {
    const activeToggle = () =>
      cy.get('[testid^="shelters-enabled-toggle-"] button[aria-checked="true"]').first();

    // whichever shelter the cases above left active first - its switch is what names it
    activeToggle().invoke('attr', 'aria-label').then((label) => {
      const name = label!.replace('Aktiv - Notschlafstelle ', '');

      activeToggle().click();
      cy.get('.toast-message').should('be.visible');

      cy.byTestId('shelters-filter-enabled').click();
      cy.byTestId('shelters-list').should('not.contain.text', name);

      cy.byTestId('shelters-filter-disabled').click();
      cy.byTestId('shelters-list').should('contain.text', name);

      // back to active, so the following cases still find a shelter they may edit
      cy.byTestId('shelters-list').contains('[testid^="shelters-row-"]', name)
        .find('[testid^="shelters-enabled-toggle-"] button').click();
      cy.get('.toast-message').should('be.visible');
      cy.byTestId('shelters-filter-all').click();
    });
  });

  it('shows validation errors and does not submit invalid shelter', () => {
    cy.byTestId('addShelterButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="name"]').should('be.visible').clear();
    cy.contains('Speichern').click();

    cy.byTestId('shelter-edit-dialog').should('be.visible');
    cy.get('input[formControlName="name"]').should('have.class', 'ng-invalid');
  });

  it('stays usable on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('addShelterButton').should('be.visible');
    cy.byTestId('shelters-row-0').should('be.visible').find('[testid^="shelters-toggle-"]').click();
    cy.byTestId('shelter-details-0').should('be.visible').and('contain.text', 'Anz. Personen');

    cy.getAnyRandomNumber().then((randomId) => {
      // Pick the first enabled shelter's edit button - the 'toggles shelter visibility' test above
      // may have left another shelter disabled (its edit button is disabled while so).
      cy.get('[testid^="editShelterButton-"]:not(:disabled)').first().click();

      const newName = 'A Shelter Updated On Phone ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('shelters-list').should('contain.text', newName);
    });
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    // Scoped to the whole record, header row included: the summary toggle, the reorder handle and
    // the two actions beside it are all siblings there, so the assertion has to see them.
    it('has no violations while a record is expanded', () => {
      cy.byTestId('shelters-row-0').find('[testid^="shelters-toggle-"]').click();
      cy.byTestId('shelter-details-0').should('be.visible');

      cy.checkAccessibility('[testid="shelters-row-0"]');
    });

    it('has no violations while the edit dialog is open, including an added contact', () => {
      cy.byTestId('addShelterButton').click();
      cy.byTestId('shelter-edit-dialog').should('be.visible');

      cy.checkDialogAccessibility();

      // a contact's own controls are one interaction deeper again
      cy.contains('Kontakt hinzufügen').click();
      cy.get('input[formControlName="firstname"]').should('be.visible');

      cy.checkDialogAccessibility();
    });

  });

  // Angular CDK's drag-and-drop contributes no keyboard behaviour of its own, so without this the
  // sort order could only be changed with a pointing device (see #3131).
  //
  // Each move waits for its request to land: a reorder re-renders the list optimistically and then
  // again from the response, so a subject captured before that second render is gone by the time it
  // is used.
  it('reorders with the keyboard and keeps focus on the moved record', () => {
    const handle = (index: number) =>
      cy.get('[testid="shelters-list"] [testid="dragShelterHandle-' + index + '"]');

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
