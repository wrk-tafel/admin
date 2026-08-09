import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Static Values', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/statische-werte');
  });

  it('lists static values', () => {
    cy.byTestId('static-values-table').should('exist');
    cy.byTestId('static-values-row-0').should('contain.text', 'Einkommensgrenze');
  });

  it('has no button to add a new static value', () => {
    cy.byTestId('addStaticValueButton').should('not.exist');
  });

  it('shows an inline input for the amount only, other columns stay read-only', () => {
    cy.byTestId('editStaticValueButton-0').click();

    // static-values-row-0 exists twice (table row + mobile card, see 'hidden md:block' /
    // 'block md:hidden' in the template) - scope to the currently-displayed one only.
    cy.byTestId('static-values-row-0').filterDisplayed().find('input[type="number"]').should('have.length', 1);
  });

  it('focuses the amount input when starting an inline edit', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.focused');
  });

  it('edits the amount of a static value inline', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.visible').clear().type('1500');
    cy.byTestId('saveStaticValueButton-0').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-row-0').should('contain.text', '1.500,00');
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('static-values-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').clear().type('999999');
      cy.byTestId('cancelStaticValueButton-0').click();

      cy.byTestId('static-values-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.visible').clear().type('1600{enter}');

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-row-0').should('contain.text', '1.600,00');
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('static-values-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').clear().type('999999{esc}');

      cy.byTestId('static-values-row-0').should('have.text', originalText);
    });
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('static-values-table').should('not.be.visible');
    cy.byTestId('static-values-cards').should('be.visible').and('contain.text', 'Einkommensgrenze');

    cy.byTestId('editStaticValueButtonMobile-0').click();
    cy.byTestId('staticValueAmountInputMobile-0').should('be.visible').clear().type('1700{enter}');

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-cards').should('contain.text', '1.700,00');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('static-values-table').should('be.visible');
    cy.byTestId('static-values-cards').should('not.be.visible');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').should('be.visible');

      cy.checkAccessibility('[testid="static-values-table"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('editStaticValueButtonMobile-0').click();
      cy.byTestId('staticValueAmountInputMobile-0').should('be.visible');

      cy.checkAccessibility('[testid="static-values-cards"]');
    });

  });

});
