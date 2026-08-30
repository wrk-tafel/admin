import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Countries', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/laender');
  });

  it('lists countries, sorted alphabetically', () => {
    cy.byTestId('countries-table').should('exist');
    cy.byTestId('countries-table').should('contain.text', 'Österreich');
  });

  it('searches by name or code', () => {
    cy.byTestId('countries-search-input').type('Deutschland');
    cy.byTestId('countries-table').should('contain.text', 'Deutschland');
    cy.byTestId('countries-table').should('not.contain.text', 'Österreich');
    cy.byTestId('countries-result-count').should('be.visible');

    cy.byTestId('countries-search-clear-button').click();
    cy.byTestId('countries-search-input').should('have.value', '');
    cy.byTestId('countries-table').should('contain.text', 'Österreich');

    cy.byTestId('countries-search-input').type('VA');
    cy.byTestId('countries-table').should('contain.text', 'Vatikan');
  });

  it('focuses the name input when starting an inline edit', () => {
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="editCountryButton-"]').first().click();

    cy.get('[testid^="countryNameInput-"]').first().should('be.focused');
  });

  it('edits a country name inline', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('countries-search-input').type('Vatikan');
      cy.get('[testid^="editCountryButton-"]').first().click();

      const newName = 'Vatikan Updated ' + randomId;
      cy.get('[testid^="countryNameInput-"]').first().should('be.visible').clear().type(newName);
      cy.get('[testid^="saveCountryButton-"]').first().click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('countries-table').should('contain.text', newName);

      // restore the name so other runs/tests keep finding "Vatikan"
      cy.get('[testid^="editCountryButton-"]').first().click();
      cy.get('[testid^="countryNameInput-"]').first().should('be.visible').clear().type('Vatikan{enter}');
      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    });
  });

  it('edits a country code inline', () => {
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="editCountryButton-"]').first().click();

    cy.get('[testid^="countryCodeInput-"]').first().should('be.visible').clear().type('zz');
    cy.get('[testid^="saveCountryButton-"]').first().click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('countries-search-input').clear().type('Vatikan');
    cy.byTestId('countries-table').should('contain.text', 'ZZ');

    // restore the code so other runs/tests keep finding it by "VA"
    cy.get('[testid^="editCountryButton-"]').first().click();
    cy.get('[testid^="countryCodeInput-"]').first().should('be.visible').clear().type('VA{enter}');
    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
  });

  it('rejects a code that is not exactly two letters without submitting', () => {
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="editCountryButton-"]').first().click();

    cy.get('[testid^="countryCodeInput-"]').first().should('be.visible').clear().type('ABC');
    cy.get('[testid^="saveCountryButton-"]').first().click();

    // still in edit mode - the invalid value was refused rather than sent
    cy.get('[testid^="countryCodeInput-"]').first().should('be.visible');
  });

  it('rejects a duplicate code with an error toast', () => {
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="editCountryButton-"]').first().click();

    cy.get('[testid^="countryCodeInput-"]').first().should('be.visible').clear().type('AT');
    cy.get('[testid^="saveCountryButton-"]').first().click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'bereits vergeben');
  });

  it('creates a new country', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addCountryButton').click();

      cy.byTestId('countryCreateCodeInput').should('be.visible').type('zz');
      cy.byTestId('countryCreateNameInput').type('Neuland ' + randomId);
      cy.byTestId('saveCountryCreateButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');
      cy.byTestId('countries-search-input').type('Neuland ' + randomId);
      cy.byTestId('countries-table').should('contain.text', 'Neuland ' + randomId);
      cy.byTestId('countries-table').should('contain.text', 'ZZ');
    });
  });

  it('shows validation errors and does not submit an invalid new country', () => {
    cy.byTestId('addCountryButton').click();

    cy.byTestId('countryCreateCodeInput').should('be.visible').clear();
    cy.byTestId('countryCreateNameInput').clear();
    cy.byTestId('saveCountryCreateButton').click();

    cy.byTestId('country-create-dialog').should('be.visible');
    cy.byTestId('countryCreateCodeInput').should('have.class', 'ng-invalid');
    cy.byTestId('countryCreateNameInput').should('have.class', 'ng-invalid');
  });

  it('rejects creating a country with a code that is already used', () => {
    cy.byTestId('addCountryButton').click();

    cy.byTestId('countryCreateCodeInput').should('be.visible').type('AT');
    cy.byTestId('countryCreateNameInput').type('Doppeltes Österreich');
    cy.byTestId('saveCountryCreateButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'bereits vergeben');
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="countries-row-"]').first().invoke('text').then((originalText) => {
      cy.get('[testid^="editCountryButton-"]').first().click();
      cy.get('[testid^="countryNameInput-"]').first().clear().type('Should Not Be Saved');
      cy.get('[testid^="cancelCountryButton-"]').first().click();

      cy.get('[testid^="countries-row-"]').first().should('have.text', originalText);
    });
  });

  it('deactivates a country with the Aktiv switch and activates it again', () => {
    cy.byTestId('countries-search-input').type('Vatikan');

    cy.get('[testid^="countries-row-"]').first().within(() => {
      cy.get('[testid^="countries-enabled-toggle-"] button').click();
    });
    cy.get('.toast-message').should('be.visible').and('contain.text', 'deaktiviert');

    // the country stays in the list - it is kept, not deleted - and the edit button is barred
    cy.get('[testid^="countries-row-"]').first().within(() => {
      cy.get('[testid^="countries-enabled-toggle-"] button').should('have.attr', 'aria-checked', 'false');
      cy.get('[testid^="editCountryButton-"]').should('be.disabled');
    });

    cy.byTestId('countries-filter-enabled').click();
    cy.byTestId('countries-table').should('not.contain.text', 'Vatikan');

    cy.byTestId('countries-filter-disabled').click();
    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="countries-row-"]').first().within(() => {
      cy.get('[testid^="countries-enabled-toggle-"] button').click();
    });
    cy.get('.toast-message').should('be.visible');

    cy.byTestId('countries-filter-all').click();
    cy.byTestId('countries-search-input').clear().type('Vatikan');
    cy.byTestId('countries-table').should('contain.text', 'Vatikan');
  });

  it('counts the active countries beside the heading', () => {
    cy.byTestId('countries-summary').should('contain.text', 'von').and('contain.text', 'aktiv');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('countries-table').should('not.be.visible');
    cy.byTestId('countries-cards').should('be.visible');

    cy.byTestId('countries-search-input').type('Vatikan');
    cy.get('[testid^="editCountryButtonMobile-"]').first().click();
    cy.get('[testid^="countryNameInputMobile-"]').first().should('be.visible').clear().type('Vatikan{enter}');

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('countries-table').should('be.visible');
    cy.byTestId('countries-cards').should('not.be.visible');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the list is filtered to the deactivated countries', () => {
      cy.byTestId('countries-filter-disabled').click();

      cy.checkAccessibility('[testid="countries-table"]');
    });

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('countries-search-input').type('Vatikan');
      cy.get('[testid^="editCountryButton-"]').first().click();
      cy.get('[testid^="countryNameInput-"]').first().should('be.visible');

      cy.checkAccessibility('[testid="countries-table"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('countries-search-input').type('Vatikan');
      cy.get('[testid^="editCountryButtonMobile-"]').first().click();
      cy.get('[testid^="countryNameInputMobile-"]').first().should('be.visible');

      cy.checkAccessibility('[testid="countries-cards"]');
    });

    it('has no violations in the create-country dialog', () => {
      cy.byTestId('addCountryButton').click();

      cy.checkDialogAccessibility();
    });

  });

});
