import {MAIN_CONTENT} from '../support/accessibility';

describe('Settings - Overview', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen');
  });

  it('lists the settings screens grouped by topic', () => {
    cy.byTestId('settings-overview').within(() => {
      cy.contains('h2', 'Logistik').should('be.visible');
      cy.contains('h2', 'Kunden & Betreuung').should('be.visible');
      cy.contains('h2', 'System').should('be.visible');
    });
    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('opens a screen from its card', () => {
    cy.byTestId('settings-overview-/einstellungen/fahrzeuge').click();

    cy.url().should('include', '/einstellungen/fahrzeuge');
  });

  it('is reached from the single Einstellungen link in the sidebar', () => {
    cy.visit('/uebersicht');
    cy.get('nav[aria-label="Hauptnavigation"]').contains('a', 'Einstellungen').click();

    cy.url().should('match', /\/einstellungen$/);
    cy.byTestId('settings-overview').should('be.visible');
  });
});
