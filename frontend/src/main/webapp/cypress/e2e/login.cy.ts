import {UserData} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Login', () => {

  beforeEach(() => {
    cy.visit('/#/login');
  });

  it('login button disabled by default', () => {
    cy.byTestId('loginButton').should('be.disabled');
  });

  it('errorMessage hidden by default', () => {
    cy.byTestId('errorMessage').should('not.exist');
  });

  it('visiting the app root while not logged in redirects to a plain login without an error message', () => {
    cy.visit('/');

    cy.url().should('contain', '/login');
    cy.url().should('not.contain', 'fehlgeschlagen');
    cy.byTestId('errorMessage').should('not.exist');
  });

  it('login successful', () => {
    enterLoginData('e2etest', 'e2etest');

    cy.url().should('contain', '/uebersicht');
  });

  it('login successful after a direct navigation to a non-root path (e.g. a bookmark)', () => {
    // Regression test for #2972: loading the app from a path other than "/" or "/#/..." (as
    // happens with a bookmarked/typed URL) must not break the app's own API calls, which rely on
    // an absolute base URL derived from the page - not the requested path.
    cy.visit('/login');

    enterLoginData('e2etest', 'e2etest');

    cy.url().should('contain', '/uebersicht');
  });

  it('login failed', () => {
    enterLoginData('dummy', 'dummy');

    cy.url().should('contain', '/login');
    cy.byTestId('errorMessage').should('exist');
  });

  it('login with required password change cannot access the dashboard', () => {
    createTestUserRequiringPasswordChange().then(({user, testUser}) => {
      cy.visit('/#/login');

      enterLoginData(user.username, testUser.password!);
      cy.url().should('contain', '/login/passwortaendern');

      cy.visit('/#/uebersicht');
      cy.url().should('contain', '/login');
      cy.byTestId('errorMessage').should('exist');
    });
  });

  it('login with required password change cancelled', () => {
    createTestUserRequiringPasswordChange().then(({user, testUser}) => {
      enterLoginData(user.username, testUser.password!);

      cy.url().should('contain', '/login/passwortaendern');
      cy.byTestId('cancelButton').click();
      cy.url().should('contain', '/login');
      cy.url().should('not.contain', 'fehlgeschlagen');

      // Cancelling must actually end the still-live session (not just navigate away from
      // it) - otherwise a stale session would let this "cancelled" login back into the app.
      cy.visit('/#/uebersicht');
      cy.url().should('contain', '/login');
      cy.byTestId('errorMessage').should('not.exist');
    });
  });

  it('login with required password change and password changed', () => {
    createTestUserRequiringPasswordChange([{key: 'CHECKIN', title: 'Anmeldung'}]).then(({user, testUser}) => {
      cy.visit('/#/login');

      enterLoginData(user.username, testUser.password!);
      cy.url().should('contain', '/login/passwortaendern');

      cy.byTestId('currentPasswordText').type(testUser.password!);
      cy.byTestId('newPasswordText').type('11111111');
      cy.byTestId('newRepeatedPasswordText').type('11111111');

      cy.byTestId('saveButton').click();
      cy.url().should('contain', '/uebersicht');
    });
  });

  it('login blocked after too many failed attempts shows the account-locked message', () => {
    createTestUser().then(({user, testUser}) => {
      // Exhaust the failed-attempt threshold via the API (fast) - the backend locks the account
      // once the configured max (10, see application.yml security.loginAttempts.maxFailures) is
      // reached, regardless of the credentials on the attempt that tips it over.
      for (let i = 0; i < 10; i++) {
        cy.createLoginRequest(user.username, 'wrong-' + testUser.password, false);
      }

      cy.visit('/#/login');
      enterLoginData(user.username, testUser.password!);

      cy.url().should('contain', '/login');
      cy.byTestId('errorMessage').should('exist').and('contain.text', 'gesperrt');
    });
  });

  it('an invalidated session redirects to login with a session-expired message', () => {
    enterLoginData('e2etest', 'e2etest');
    cy.url().should('contain', '/uebersicht');

    cy.contains('Kunden suchen').click();
    cy.url().should('include', '/kunden/suchen');

    // Simulates a session expiring server-side mid-use: the client still thinks it's
    // authenticated (in-memory state survives, since only a real page reload would clear it),
    // but the next authenticated request the app makes gets a 401 from the server.
    cy.clearCookie('tafel-admin-jwt');

    // Route resolvers (e.g. the above-limit list's data fetch) fire an authenticated request
    // before the target component even mounts - that's what's used here to trigger the 401.
    cy.contains('Kunden über Limit').click();

    cy.url().should('contain', '/login/abgelaufen');
    cy.byTestId('errorMessage').should('exist').and('contain.text', 'Sitzung abgelaufen');
  });

  it('accessing a module without the required permission shows access denied', () => {
    createTestUser([{key: 'CHECKIN', title: 'Anmeldung'}]).then(({user, testUser}) => {
      cy.visit('/#/login');
      enterLoginData(user.username, testUser.password!);

      // CHECKIN is enough to pass uebersicht's generic anyPermission check...
      cy.url().should('contain', '/uebersicht');

      // ...but kunden specifically requires CUSTOMER, which this user was never given.
      cy.visit('/#/kunden/suchen');

      cy.url().should('contain', '/login/fehlgeschlagen');
      cy.byTestId('errorMessage').should('exist').and('contain.text', 'Zugriff nicht erlaubt');
    });
  });

  it('remains usable on a phone viewport', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/#/login');

    cy.byTestId('username').should('be.visible').type('e2etest');
    cy.byTestId('password').should('be.visible').type('e2etest');
    cy.byTestId('loginButton').should('be.enabled').click();

    cy.url().should('contain', '/uebersicht');
  });

  it('remains usable on a tablet viewport', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/#/login');

    cy.byTestId('username').should('be.visible').type('e2etest');
    cy.byTestId('password').should('be.visible').type('e2etest');
    cy.byTestId('loginButton').should('be.enabled').click();

    cy.url().should('contain', '/uebersicht');
  });

  function createTestUser(permissions: { key: string; title: string }[] = []) {
    return cy.getAnyRandomNumber().then(randomNumber => {
      const testUser: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: 'personnelnumber-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: 'dummy-' + randomNumber,
        passwordRepeat: 'dummy-' + randomNumber,
        passwordChangeRequired: false,
        permissions
      };

      cy.loginDefault();
      return cy.createUser(testUser).then(response => ({user: response.body, testUser}));
    });
  }

  function createTestUserRequiringPasswordChange(permissions: { key: string; title: string }[] = []) {
    return cy.getAnyRandomNumber().then(randomNumber => {
      const testUser: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: 'personnelnumber-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password: 'dummy-' + randomNumber,
        passwordRepeat: 'dummy-' + randomNumber,
        passwordChangeRequired: true,
        permissions
      };

      cy.loginDefault();
      return cy.createUser(testUser).then(response => ({user: response.body, testUser}));
    });
  }

  function enterLoginData(username: string, password: string) {
    cy.byTestId('username').type(username);
    cy.byTestId('password').type(password);
    cy.byTestId('loginButton').click();
  }

});
