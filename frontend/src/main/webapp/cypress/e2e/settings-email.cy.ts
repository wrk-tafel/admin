describe('Settings - Email - Resend distribution mails', () => {

  beforeEach(() => {
    cy.loginDefault();
    // Unlike the other two screens with a distribution select, this one loads its options from a
    // component-internal effect rather than a route resolver - nothing blocks the page from
    // becoming interactive before that request resolves, so every test waits for it before
    // opening the select.
    cy.intercept('GET', '/api/distributions').as('getDistributions');
  });

  // The list this select opens accumulates across the whole e2e run, so the target distribution
  // is found by its id (captured from the create response) rather than by position.
  it('resends the mails for a distribution chosen from the select', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');
      cy.wait('@getDistributions');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();
      cy.byTestId('sendMailsDistributionInput').invoke('text').should('match', /^\d{2}\.\d{2}\.\d{4}$/);

      cy.byTestId('send-mails-button').should('be.enabled').click();

      cy.contains('.toast-message', 'E-Mails wurden erneut verschickt').should('be.visible');
    });
  });

  describe('accessibility', () => {

    // The panel only exists after a click, so neither the template lint nor the Lighthouse
    // `pages` sweep ever sees it - see cypress/support/accessibility.ts.
    it('has no violations with the distribution select open', () => {
      cy.createDistribution();
      cy.closeDistribution();

      cy.visit('/einstellungen/email');
      cy.wait('@getDistributions');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.checkSelectAccessibility();
    });

  });

});
