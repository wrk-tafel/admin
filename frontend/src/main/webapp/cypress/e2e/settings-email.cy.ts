describe('Settings - Email - Resend distribution mails', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  // The list this select opens accumulates across the whole e2e run, so the target distribution
  // is found by its id (captured from the create response) rather than by position.
  it('resends the mails for a distribution chosen from the select', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();
      cy.byTestId('sendMailsDistributionInput').invoke('text').should('match', /^\d{2}\.\d{2}\.\d{4}$/);

      cy.byTestId('send-mails-button').should('be.enabled').click();

      cy.contains('.toast-message', 'E-Mails wurden erneut verschickt').should('be.visible');
    });
  });

  it('re-picking the already-selected distribution keeps its formatted label', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      // select it explicitly first - the default preselection is the newest distribution, which
      // this one is not guaranteed to be if another test's distribution ties on the same second
      cy.byTestId('sendMailsDistributionInput').click();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();

      cy.byTestId('sendMailsDistributionInput').invoke('text').then((selectedLabel) => {
        cy.byTestId('sendMailsDistributionInput').click();
        cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();
        cy.byTestId('sendMailsDistributionInput').invoke('text').should('equal', selectedLabel);
      });
    });
  });

  describe('accessibility', () => {

    // The panel only exists after a click, so neither the template lint nor the Lighthouse
    // `pages` sweep ever sees it - see cypress/support/accessibility.ts.
    it('has no violations with the distribution select open', () => {
      cy.createDistribution();
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.checkSelectAccessibility();
    });

  });

});
