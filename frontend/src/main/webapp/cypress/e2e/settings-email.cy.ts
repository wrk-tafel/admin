describe('Settings - Email - Resend distribution mails', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  // The list this autocomplete searches accumulates across the whole e2e run, so the target
  // distribution is found by its id (captured from the create response) rather than by position.
  it('resends the mails for a distribution chosen through the autocomplete', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();
      cy.byTestId('sendMailsDistributionInput').invoke('val').should('match', /^\d{2}\.\d{2}\.\d{4}$/);

      cy.byTestId('send-mails-button').should('be.enabled').click();

      cy.contains('.toast-message', 'E-Mails wurden erneut verschickt').should('be.visible');
    });
  });

  // MatAutocompleteTrigger writes a selected option straight into the input, bypassing Angular's
  // own binding, so re-picking the already-selected distribution only self-corrects when
  // [displayWith] formats that raw value too - without it, the raw value's toString() was left
  // behind (#3654).
  it('re-picking the already-selected distribution keeps its formatted label, not the raw value', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      // select it explicitly first - the default preselection is the newest distribution, which
      // this one is not guaranteed to be if another test's distribution ties on the same second
      cy.byTestId('sendMailsDistributionInput').click();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();

      cy.byTestId('sendMailsDistributionInput').invoke('val').then((selectedLabel) => {
        cy.byTestId('sendMailsDistributionInput').click();
        cy.byTestId('sendMailsDistributionInput-option-' + distributionId).click();
        cy.byTestId('sendMailsDistributionInput').should('have.value', selectedLabel);
      });
    });
  });

  it('narrows the list to distributions matching the typed text', () => {
    cy.request('POST', '/api/distributions/new').then((createResponse) => {
      const distributionId = createResponse.body.distribution.id;
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      // a date that matches no distribution filters the freshly created one out of the list
      cy.byTestId('sendMailsDistributionInput').clear().type('31.12.2099');
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).should('not.exist');

      // clearing the search shows the full list again
      cy.byTestId('sendMailsDistributionInput').clear();
      cy.byTestId('sendMailsDistributionInput-option-' + distributionId).should('exist');
    });
  });

  describe('accessibility', () => {

    // The panel only exists after a click, so neither the template lint nor the Lighthouse
    // `pages` sweep ever sees it - see cypress/support/accessibility.ts.
    it('has no violations with the distribution autocomplete open', () => {
      cy.createDistribution();
      cy.closeDistribution();

      cy.visit('/einstellungen/email');

      cy.byTestId('sendMailsDistributionInput').click();
      cy.checkAutocompleteAccessibility();
    });

  });

});
