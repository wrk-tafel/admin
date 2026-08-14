describe('Global quick-open', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/uebersicht');
  });

  // `cy.get('body')` matches long before Angular has bootstrapped the shell, so a Ctrl+K typed
  // right after cy.visit would fire before the shortcut listener exists and simply vanish.
  // Waiting for the header's own quick-open button is what "the shell is ready" looks like.
  const openPaletteViaShortcut = () => {
    cy.byTestId('quickOpenButton').should('be.visible');
    cy.get('body').type('{ctrl}k');
    cy.byTestId('quick-open-dialog').should('be.visible');
  };

  it('opens via the toolbar button and jumps to a navigation entry', () => {
    cy.byTestId('quickOpenButton').click();
    cy.byTestId('quick-open-dialog').should('be.visible');

    // the dialog only exists after this click, so the page sweep never audits it - see
    // cypress/support/accessibility.ts
    cy.checkDialogAccessibility();

    cy.byTestId('quickOpenInput').type('Filialen');
    cy.byTestId('quickOpenNav-/einstellungen/filialen').click();

    cy.url().should('include', '/einstellungen/filialen');
    cy.byTestId('quick-open-dialog').should('not.exist');
  });

  it('opens via Ctrl+K and finds a customer by name', () => {
    cy.intercept('GET', '/api/households*').as('searchHouseholds');

    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      openPaletteViaShortcut();

      cy.byTestId('quickOpenInput').type(customer.lastname);
      cy.wait('@searchHouseholds');

      cy.byTestId(`quickOpenCustomer-${customer.id}`).click();

      cy.url().should('include', '/kunden/detail/' + customer.id);
      cy.byTestId('quick-open-dialog').should('not.exist');
    });
  });

  it('Enter opens the first result', () => {
    openPaletteViaShortcut();
    cy.byTestId('quickOpenInput').type('Fahrzeuge{enter}');

    cy.url().should('include', '/einstellungen/fahrzeuge');
    cy.byTestId('quick-open-dialog').should('not.exist');
  });

  it('arrow keys move the focus through the results', () => {
    openPaletteViaShortcut();
    cy.byTestId('quickOpenInput').type('Notschlafstellen');

    cy.byTestId('quickOpenInput').type('{downarrow}');
    cy.focused().should('have.attr', 'testid', 'quickOpenNav-/einstellungen/notschlafstellen');

    // ArrowUp from the first entry returns to the input
    cy.focused().type('{uparrow}');
    cy.focused().should('have.attr', 'testid', 'quickOpenInput');
  });

  it('shows the no-customers state for a query matching nothing', () => {
    cy.intercept('GET', '/api/households*').as('searchHouseholds');

    openPaletteViaShortcut();
    cy.byTestId('quickOpenInput').type('zzzz-gibt-es-sicher-nicht');
    cy.wait('@searchHouseholds');

    cy.byTestId('quickOpenNoCustomers').should('be.visible');
  });

  it('Escape closes the palette without navigating', () => {
    cy.url().then((urlBefore) => {
      openPaletteViaShortcut();

      cy.get('body').type('{esc}');
      cy.byTestId('quick-open-dialog').should('not.exist');
      cy.url().should('eq', urlBefore);
    });
  });

});
