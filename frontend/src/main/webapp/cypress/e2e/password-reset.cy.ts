import {testUserPassword} from '../support/commands';

// Where the e2e backend delivers its mails (application-e2e.yml): the Mailpit service of the CI job,
// or docker-compose's locally - both on the default port.
const MAILPIT_URL = 'http://localhost:8025';

describe('Password reset', () => {

  function createUserWithEmail(): Cypress.Chainable<{ username: string; email: string }> {
    cy.intercept('GET', '/api/users/info').as('userInfo');
    cy.loginDefault();
    // the shell's first request is what hands out the XSRF cookie bound to this session, which the
    // POST below needs
    cy.visit('/uebersicht');
    cy.wait('@userInfo');
    return cy.getAnyRandomNumber().then((randomNumber) => {
      const password = testUserPassword(randomNumber);
      const username = 'reset-' + randomNumber;
      const email = 'reset-' + randomNumber + '@e2e-test.example';
      return cy.createUser({
        username,
        personnelNumber: 'reset' + randomNumber,
        firstname: 'Reset',
        lastname: 'User ' + randomNumber,
        email,
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired: false,
        permissions: [{key: 'CUSTOMER', title: 'Kundenverwaltung'}]
      })
        .then(() => cy.clearCookies())
        .then(() => ({username, email}));
    });
  }

  /** Waits for the reset mail to `email` and returns the token from its link. */
  function tokenFromMail(email: string): Cypress.Chainable<string> {
    const findMessage = (attempt: number): Cypress.Chainable<string> =>
      cy.request(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent('to:"' + email + '" subject:"Passwort zurücksetzen"')}`)
        .then((response) => {
          const message = response.body.messages?.[0];
          if (!message && attempt < 30) {
            cy.wait(1000);
            return findMessage(attempt + 1);
          }
          expect(message, 'reset mail to ' + email).to.exist;
          return cy.request(`${MAILPIT_URL}/api/v1/message/${message.ID}`).then((detail) => {
            const match = /passwort-zuruecksetzen#token=([A-Za-z0-9_-]+)/.exec(detail.body.HTML as string);
            expect(match, 'link in the mail').to.not.equal(null);
            return match![1];
          });
        });
    return findMessage(0);
  }

  it('sets a new password with the mailed link, which works only once', () => {
    createUserWithEmail().then(({username, email}) => {
      cy.visit('/login');
      cy.byTestId('forgotPasswordLink').click();

      cy.url().should('include', '/passwort-vergessen');
      cy.byTestId('identifier').should('be.visible');
      cy.checkAccessibility();
      cy.byTestId('identifier').type(username);
      cy.byTestId('requestResetButton').click();
      cy.byTestId('forgotPasswordSent').should('be.visible');

      tokenFromMail(email).then((token) => {
        cy.visit('/passwort-zuruecksetzen#token=' + token);
        cy.byTestId('newPassword').should('be.visible');
        cy.checkAccessibility();
        cy.byTestId('newPassword').type('aNewResetPassword-9');
        cy.byTestId('newRepeatedPassword').type('aNewResetPassword-9');
        cy.byTestId('savePasswordButton').click();
        cy.byTestId('resetPasswordDone').should('be.visible');

        cy.byTestId('goToLoginButton').click();
        cy.byTestId('username').type(username);
        cy.byTestId('password').type('aNewResetPassword-9');
        cy.byTestId('loginButton').click();
        cy.url().should('include', '/uebersicht');

        // the same link a second time
        cy.clearCookies();
        cy.visit('/passwort-zuruecksetzen#token=' + token);
        cy.byTestId('newPassword').type('anotherPassword-8');
        cy.byTestId('newRepeatedPassword').type('anotherPassword-8');
        cy.byTestId('savePasswordButton').click();
        cy.byTestId('resetPasswordInvalidLink').should('be.visible');
        cy.checkAccessibility();
        cy.byTestId('requestNewLinkButton').should('have.attr', 'href').and('include', '/passwort-vergessen');
      });
    });
  });

  it('answers an unknown username exactly like a known one', () => {
    cy.intercept('POST', '/api/password-reset/request').as('resetRequest');
    cy.visit('/passwort-vergessen');

    cy.byTestId('identifier').type('nobody-with-this-name');
    cy.byTestId('requestResetButton').click();

    cy.wait('@resetRequest').its('response.statusCode').should('eq', 202);
    cy.byTestId('forgotPasswordSent').should('be.visible');
  });

  it('shows a link without a token as invalid, without sending anything', () => {
    cy.intercept('POST', '/api/password-reset/confirm', cy.spy().as('confirmRequest'));
    cy.visit('/passwort-zuruecksetzen');

    cy.byTestId('resetPasswordInvalidLink').should('be.visible');
    cy.get('@confirmRequest').should('not.have.been.called');
  });

  it('opens the reset page from a link without setting anything until the button is pressed', () => {
    cy.intercept('POST', '/api/password-reset/confirm', cy.spy().as('confirmRequest'));
    cy.visit('/passwort-zuruecksetzen#token=not-a-real-token');

    cy.byTestId('savePasswordButton').should('be.visible');
    cy.get('@confirmRequest').should('not.have.been.called');
  });
});
