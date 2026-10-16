import {testUserPassword} from '../support/commands';

// Where the e2e backend delivers its mails (application-e2e.yml): the Mailpit service of the CI job,
// or docker-compose's locally - both on the default port.
const MAILPIT_URL = 'http://localhost:8025';

describe('E-mail address change', () => {

  /** Waits for the confirmation mail to `email` and returns the token from its link. */
  function tokenFromMail(email: string, attempt = 0): Cypress.Chainable<string> {
    return cy.request(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent('to:"' + email + '" subject:"Neue E-Mail-Adresse"')}`)
      .then((response) => {
        const message = response.body.messages?.[0];
        if (!message && attempt < 30) {
          cy.wait(1000);
          return tokenFromMail(email, attempt + 1);
        }
        expect(message, 'confirmation mail to ' + email).to.not.equal(undefined);
        return cy.request(`${MAILPIT_URL}/api/v1/message/${message.ID}`).then((detail) => {
          const match = /e-mail-bestaetigen#token=([A-Za-z0-9_-]+)/.exec(detail.body.HTML as string);
          expect(match, 'link in the mail').to.not.equal(null);
          return match![1];
        });
      });
  }

  it('takes the new address only after the link sent to the old one was confirmed, once', () => {
    cy.intercept('GET', '/api/users/info').as('userInfo');
    cy.loginDefault();
    cy.visit('/uebersicht');
    cy.wait('@userInfo');

    cy.getAnyRandomNumber().then((randomNumber) => {
      const password = testUserPassword(randomNumber);
      const username = 'mailchange-' + randomNumber;
      const oldEmail = 'old-' + randomNumber + '@e2e-test.example';
      const newEmail = 'new-' + randomNumber + '@e2e-test.example';
      cy.createUser({
        username,
        personnelNumber: 'mc' + randomNumber,
        firstname: 'Mail',
        lastname: 'Change ' + randomNumber,
        email: oldEmail,
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired: false,
        permissions: [{key: 'CUSTOMER', title: 'Kundenverwaltung'}]
      });

      cy.clearCookies();
      cy.login(username, password);
      cy.visit('/konto/daten');
      cy.byTestId('account-email').clear().type(newEmail);
      cy.byTestId('account-save-button').click();
      cy.byTestId('account-pending-email').should('contain.text', newEmail);

      tokenFromMail(oldEmail).then((token) => {
        // the link is opened without a session, maybe on another device
        cy.clearCookies();
        cy.visit('/e-mail-bestaetigen#token=' + token);
        cy.byTestId('confirmEmailChangeButton').should('be.visible');
        cy.checkAccessibility();
        cy.byTestId('confirmEmailChangeButton').click();
        cy.byTestId('emailChangeDone').should('be.visible');

        cy.login(username, password);
        cy.visit('/konto/daten');
        cy.byTestId('account-email').should('have.value', newEmail);
        cy.byTestId('account-pending-email').should('not.exist');

        // the same link a second time
        cy.clearCookies();
        cy.visit('/e-mail-bestaetigen#token=' + token);
        cy.byTestId('confirmEmailChangeButton').click();
        cy.byTestId('emailChangeInvalidLink').should('be.visible');
        cy.checkAccessibility();
      });
    });
  });

  it('opens the confirmation page without confirming anything until the button is pressed', () => {
    cy.intercept('POST', '/api/email-change/confirm', cy.spy().as('confirmRequest'));
    cy.visit('/e-mail-bestaetigen#token=not-a-real-token');

    cy.byTestId('confirmEmailChangeButton').should('be.visible');
    cy.get('@confirmRequest').should('not.have.been.called');
  });
});
