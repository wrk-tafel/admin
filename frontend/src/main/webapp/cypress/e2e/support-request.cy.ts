describe('Support request', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/uebersicht');
  });

  it('sends a support request with the technical context attached', () => {
    cy.intercept('POST', '/api/support').as('createSupportRequest');

    cy.byTestId('supportButton').click();
    cy.byTestId('support-dialog').should('be.visible');

    // the dialog only exists after this click, so the page sweep never audits it - see
    // cypress/support/accessibility.ts
    cy.checkDialogAccessibility();

    cy.byTestId('supportHint').should('contain.text', 'technische Infos');

    // the screenshot is of the page behind the dialog, and the reporter can see what they send
    cy.byTestId('screenshotPreview').should('be.visible')
      .and('have.attr', 'src')
      .and('match', /^data:image\/jpeg;base64,/);
    cy.byTestId('includeScreenshot').find('input').should('be.checked');

    cy.byTestId('okButton').should('be.disabled');

    cy.byTestId('supportTitle').type('Login geht nicht');
    cy.byTestId('supportText').type('Nach dem Anmelden bleibt die Seite leer.');
    cy.byTestId('okButton').should('not.be.disabled').click();

    cy.wait('@createSupportRequest').then(({request, response}) => {
      expect(response!.statusCode).to.eq(201);
      expect(request.body.title).to.eq('Login geht nicht');
      expect(request.body.text).to.eq('Nach dem Anmelden bleibt die Seite leer.');

      // the half of the mail nobody types - collected by SupportContextService
      expect(request.body.clientContext.page).to.contain('/uebersicht');
      expect(request.body.clientContext.userAgent).to.have.length.greaterThan(0);
      expect(request.body.clientContext.viewport).to.match(/^\d+x\d+$/);
      expect(request.body.clientContext.screen).to.match(/^\d+x\d+$/);
      expect(request.body.clientContext.recentErrors).to.be.an('array');
      expect(request.body.clientContext.screenshot).to.match(/^data:image\/jpeg;base64,/);
    });

    cy.contains('Support-Anfrage wurde übermittelt!');
    cy.byTestId('support-dialog').should('not.exist');
  });

  it('leaves the screenshot out when the reporter unchecks it', () => {
    cy.intercept('POST', '/api/support').as('createSupportRequest');

    cy.byTestId('supportButton').click();
    cy.byTestId('includeScreenshot').click();
    cy.byTestId('includeScreenshot').find('input').should('not.be.checked');

    cy.byTestId('supportTitle').type('Login geht nicht');
    cy.byTestId('supportText').type('Ohne Screenshot.');
    cy.byTestId('okButton').click();

    cy.wait('@createSupportRequest').then(({request, response}) => {
      expect(response!.statusCode).to.eq(201);
      expect(request.body.clientContext.screenshot).to.eq(null);
      // everything else still goes along
      expect(request.body.clientContext.page).to.contain('/uebersicht');
    });
  });

  it('sends nothing when the dialog is cancelled', () => {
    cy.intercept('POST', '/api/support').as('createSupportRequest');

    cy.byTestId('supportButton').click();
    cy.byTestId('supportTitle').type('Doch nicht');
    cy.byTestId('cancelButton').click();

    cy.byTestId('support-dialog').should('not.exist');
    cy.get('@createSupportRequest.all').should('have.length', 0);
  });

});
