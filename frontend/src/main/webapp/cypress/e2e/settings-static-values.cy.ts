import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

/**
 * An amount as the screen renders it, e.g. `1505` -> `1.505,00`. Deliberately `de-DE` rather than
 * the application's `de-AT`: Angular's locale data groups with a dot, while the browser's `de-AT`
 * groups with a narrow no-break space - so `de-AT` here would compare against a string the screen
 * never shows.
 */
const formatAmount = (amount: number) =>
  amount.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * Types an amount that differs from the one the row currently holds, and hands both to the
 * assertions. A fixed amount would be the row's own on a database an earlier run already edited -
 * and the screen asks for no confirmation when nothing changed, so the test would be measuring the
 * leftover value rather than the flow.
 */
const editAmountBy = (
  inputTestId: string,
  increment: number,
  assertions: (previous: number, next: number) => void,
  suffix = ''
) => {
  cy.byTestId(inputTestId).should('be.visible').invoke('val').then((value) => {
    const previous = Number(value);
    const next = previous + increment;

    cy.byTestId(inputTestId).clear().type(`${next}${suffix}`);
    assertions(previous, next);
  });
};

describe('Settings - Static Values', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/statische-werte');
  });

  it('lists static values, grouped into their two domains', () => {
    cy.byTestId('static-values-group-income').should('contain.text', 'Einkommensgrenze');
    cy.byTestId('static-values-group-costContribution').should('contain.text', 'Unkostenbeitrag');

    cy.byTestId('static-values-table-INCOME_LIMIT').should('exist');
    cy.byTestId('static-values-row-0').should('contain.text', '1 Erwachsener, 0 Kinder');
  });

  it('explains what each value is applied to', () => {
    cy.byTestId('static-values-description-ADDITIONAL_ADULT')
      .should('contain.text', 'pro weiterem Erwachsenen zur Einkommensgrenze addiert');
    cy.byTestId('static-values-description-COST_CONTRIBUTION').should('not.be.empty');
  });

  it('links to the customers above the limit and to the access log of these values', () => {
    cy.byTestId('static-values-above-limit-link').should('have.attr', 'href', '/kunden/ueber-limit');
    cy.byTestId('static-values-audit-link')
      .should('have.attr', 'href', '/zugriffsprotokoll?art=StaticValue');
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

  it('edits the amount of a static value after confirming the change', () => {
    cy.byTestId('editStaticValueButton-0').click();

    editAmountBy('staticValueAmountInput-0', 5, (previous, next) => {
      cy.byTestId('saveStaticValueButton-0').click();

      cy.byTestId('static-value-change-dialog').should('be.visible');
      cy.byTestId('static-value-change-label').should('contain.text', 'Einkommensgrenze - 1 Erwachsener, 0 Kinder');
      cy.byTestId('static-value-change-old').should('contain.text', formatAmount(previous));
      cy.byTestId('static-value-change-new').should('contain.text', formatAmount(next));
      cy.byTestId('confirmButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('static-values-row-0').should('contain.text', formatAmount(next));
    });
  });

  it('keeps the old amount when the confirmation is dismissed', () => {
    cy.byTestId('static-values-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').clear().type('999999');
      cy.byTestId('saveStaticValueButton-0').click();

      cy.byTestId('static-value-change-dialog').should('be.visible');
      cy.byTestId('cancelButton').click();
      cy.byTestId('static-value-change-dialog').should('not.exist');

      cy.byTestId('cancelStaticValueButton-0').click();
      cy.byTestId('static-values-row-0').should('have.text', originalText);
    });
  });

  it('does not ask for a confirmation when the amount was left as it was', () => {
    cy.byTestId('editStaticValueButton-0').click();
    cy.byTestId('saveStaticValueButton-0').click();

    cy.byTestId('static-value-change-dialog').should('not.exist');
    cy.byTestId('editStaticValueButton-0').should('be.visible');
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

    editAmountBy('staticValueAmountInput-0', 7, (_previous, next) => {
      cy.byTestId('confirmButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('static-values-row-0').should('contain.text', formatAmount(next));
    }, '{enter}');
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

    cy.byTestId('static-values-table-INCOME_LIMIT').should('not.be.visible');
    // The explanations above it push the first card list below the fold on a phone.
    cy.byTestId('static-values-cards-INCOME_LIMIT').scrollIntoView()
      .should('be.visible').and('contain.text', '1 Erwachsener');

    cy.byTestId('editStaticValueButtonMobile-0').click();

    editAmountBy('staticValueAmountInputMobile-0', 9, (_previous, next) => {
      cy.byTestId('confirmButton').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('static-values-cards-INCOME_LIMIT').should('contain.text', formatAmount(next));
    }, '{enter}');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('static-values-table-INCOME_LIMIT').should('be.visible');
    cy.byTestId('static-values-cards-INCOME_LIMIT').should('not.be.visible');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').should('be.visible');

      cy.checkAccessibility('[testid="static-values-table-INCOME_LIMIT"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('editStaticValueButtonMobile-0').click();
      cy.byTestId('staticValueAmountInputMobile-0').should('be.visible');

      cy.checkAccessibility('[testid="static-values-cards-INCOME_LIMIT"]');
    });

    it('has no violations in the change confirmation', () => {
      cy.byTestId('editStaticValueButton-0').click();

      editAmountBy('staticValueAmountInput-0', 3, () => {
        cy.byTestId('saveStaticValueButton-0').click();

        cy.byTestId('static-value-change-dialog').should('be.visible');
        cy.checkDialogAccessibility();
      });
    });

  });

});
