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

  // The settings take the sidebar over while one of their pages is open: the overview, every screen under its group,
  // and the way back to the main menu.
  it('lists the settings screens in the sidebar while a settings page is open', () => {
    cy.byTestId('main-nav').should('not.exist');
    cy.get('nav[aria-label="Einstellungen"]').should('have.attr', 'testid', 'settings-nav');
    cy.byTestId('settings-nav-overview').should('have.attr', 'aria-current', 'page');
    cy.byTestId('settings-nav').within(() => {
      cy.contains('Logistik').should('be.visible');
      cy.contains('Kunden & Betreuung').should('be.visible');
      cy.contains('System').should('be.visible');
    });
    cy.checkAccessibility('nav[testid="settings-nav"]');

    cy.byTestId('settings-nav-fahrzeuge').click();
    cy.url().should('match', /\/einstellungen\/fahrzeuge$/);
    cy.byTestId('settings-nav-fahrzeuge').should('have.attr', 'aria-current', 'page');
    cy.byTestId('settings-nav-overview').should('not.have.attr', 'aria-current');

    cy.byTestId('settings-nav-laender').click();
    cy.url().should('match', /\/einstellungen\/laender$/);
    cy.byTestId('settings-nav-laender').should('have.attr', 'aria-current', 'page');

    cy.byTestId('settings-nav-back').click();
    cy.url().should('contain', '/uebersicht');
    cy.byTestId('main-nav').should('be.visible');
    cy.byTestId('settings-nav').should('not.exist');
  });

  // Opened from the "Einstellungen" entry far down the main menu, the settings menu starts at its top, not at its end.
  it('starts the settings menu at its top when opened from further down the main menu', () => {
    cy.viewport(1280, 600);
    cy.visit('/uebersicht');
    cy.byTestId('main-nav').scrollTo('bottom').contains('a', 'Einstellungen').click();

    cy.url().should('match', /\/einstellungen$/);
    cy.byTestId('settings-nav').should($nav => expect($nav[0].scrollTop).to.equal(0));
    cy.byTestId('settings-nav-back').should('be.visible');
  });
});
