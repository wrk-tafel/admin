import {testUserPassword, UserData} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Login', () => {

  beforeEach(() => {
    cy.visit('/login');
  });

  it('login button disabled by default', () => {
    cy.byTestId('loginButton').should('be.disabled');
  });

  it('errorMessage hidden by default', () => {
    cy.byTestId('errorMessage').should('not.exist');
  });

  // Read from /api/config/public, the only endpoint reachable without a session - a unit spec with a
  // mocked service can't tell whether that request is actually let through unauthenticated.
  it('environmentLabel shows the environment this deployment is', () => {
    cy.byTestId('environmentLabel').should('be.visible').and('contain.text', 'E2E');
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

  // The password generator produces umlauts (GermanCharacterData in WebSecurityConfig), so this is
  // an everyday password here, not an exotic one. It only works if the credentials go out UTF-8
  // encoded - the encoding is invisible to a unit spec, which never crosses the wire (see #3100).
  it('login with an umlaut in the password', () => {
    createTestUser([{key: 'CHECKIN', title: 'Anmeldung'}], 'pwdMitÄumlaut-').then(({user, testUser}) => {
      cy.visit('/login');

      enterLoginData(user.username, testUser.password!);

      cy.url().should('contain', '/uebersicht');
    });
  });

  it('login failed', () => {
    enterLoginData('dummy', 'dummy');

    cy.url().should('contain', '/login');
    cy.byTestId('errorMessage').should('exist');
  });

  // The toggle used to be a bare icon with a click handler: reachable by mouse only and nameless to
  // a screen reader, which a unit spec asserting the component's own state cannot tell apart from a
  // real button.
  it('the password visibility toggle is reachable and operable with the keyboard', () => {
    cy.byTestId('password').type('geheim');
    cy.byTestId('password').should('have.attr', 'type', 'password');

    cy.byTestId('passwordVisibilityToggle')
      .should('have.attr', 'aria-label', 'Passwort anzeigen')
      .should('have.attr', 'aria-pressed', 'false')
      .focus();

    cy.focused().should('have.attr', 'testid', 'passwordVisibilityToggle').click();

    cy.byTestId('password').should('have.attr', 'type', 'text');
    cy.byTestId('passwordVisibilityToggle')
      .should('have.attr', 'aria-label', 'Passwort verbergen')
      .should('have.attr', 'aria-pressed', 'true');
  });

  it('login with required password change cannot access the dashboard', () => {
    createTestUserRequiringPasswordChange().then(({user, testUser}) => {
      cy.visit('/login');

      enterLoginData(user.username, testUser.password!);
      cy.url().should('contain', '/login/passwortaendern');

      cy.visit('/uebersicht');
      cy.url().should('contain', '/login');
      cy.byTestId('errorMessage').should('exist');
    });
  });

  it('login with required password change cancelled', () => {
    createTestUserRequiringPasswordChange().then(({user, testUser}) => {
      enterLoginData(user.username, testUser.password!);

      cy.url().should('contain', '/login/passwortaendern');

      // Cancelling logs out server-side and only then navigates. Wait for that round-trip: the
      // cy.visit() below otherwise tears the page down while the request is still in flight, which
      // leaves the session alive and lands on /login/fehlgeschlagen instead of a plain login.
      cy.intercept('POST', '/api/users/logout').as('cancelLogout');
      cy.byTestId('cancelButton').click();
      cy.wait('@cancelLogout');

      // Matched exactly - a 'contain' assertion would already be satisfied by the
      // /login/passwortaendern the cancel is supposed to navigate away from.
      cy.url().should('match', /\/login$/);

      // Cancelling must actually end the still-live session (not just navigate away from
      // it) - otherwise a stale session would let this "cancelled" login back into the app.
      cy.visit('/uebersicht');
      cy.url().should('contain', '/login');
      cy.byTestId('errorMessage').should('not.exist');
    });
  });

  it('login with required password change and password changed', () => {
    createTestUserRequiringPasswordChange([{key: 'CHECKIN', title: 'Anmeldung'}]).then(({user, testUser}) => {
      cy.visit('/login');

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

      cy.visit('/login');
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
    // "Kunden über Limit" lives under the collapsible "Sonstige" nav group - expand it first
    // (the `button` selector disambiguates from the unrelated "Sonstige" section title lower in the nav)
    cy.contains('button', 'Sonstige').click();
    cy.contains('Kunden über Limit').click();

    cy.url().should('contain', '/login/abgelaufen');
    cy.byTestId('errorMessage').should('exist').and('contain.text', 'Sitzung abgelaufen');
  });

  it('an invalidated session redirects to login even via a route with no data-fetch of its own', () => {
    enterLoginData('e2etest', 'e2etest');
    cy.url().should('contain', '/uebersicht');

    cy.clearCookie('tafel-admin-jwt');

    // "Passwort ändern" has no resolver and its component fires no HTTP request on mount - before
    // this fix, AuthGuardService only ever checked a stale in-memory flag, so a click like this
    // one was silently ignored instead of redirecting (see #2976).
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-changepassword').click();

    cy.url().should('contain', '/login/abgelaufen');
    cy.byTestId('errorMessage').should('exist').and('contain.text', 'Sitzung abgelaufen');
  });

  it('accessing a module without the required permission shows access denied', () => {
    createTestUser([{key: 'CHECKIN', title: 'Anmeldung'}]).then(({user, testUser}) => {
      cy.visit('/login');
      enterLoginData(user.username, testUser.password!);

      // CHECKIN is enough to pass uebersicht's generic anyPermission check...
      cy.url().should('contain', '/uebersicht');

      // ...but kunden specifically requires CUSTOMER, which this user was never given.
      cy.visit('/kunden/suchen');

      cy.url().should('contain', '/login/fehlgeschlagen');
      cy.byTestId('errorMessage').should('exist').and('contain.text', 'Zugriff nicht erlaubt');
    });
  });

  it('remains usable on a phone viewport', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/login');

    cy.byTestId('username').should('be.visible').type('e2etest');
    cy.byTestId('password').should('be.visible').type('e2etest');
    cy.byTestId('loginButton').should('be.enabled').click();

    cy.url().should('contain', '/uebersicht');
  });

  it('remains usable on a tablet viewport', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.visit('/login');

    cy.byTestId('username').should('be.visible').type('e2etest');
    cy.byTestId('password').should('be.visible').type('e2etest');
    cy.byTestId('loginButton').should('be.enabled').click();

    cy.url().should('contain', '/uebersicht');
  });

  function createTestUser(permissions: { key: string; title: string }[] = [], passwordPrefix?: string) {
    return createUserWith(false, permissions, passwordPrefix);
  }

  function createTestUserRequiringPasswordChange(permissions: { key: string; title: string }[] = []) {
    return createUserWith(true, permissions);
  }

  function createUserWith(
    passwordChangeRequired: boolean,
    permissions: { key: string; title: string }[],
    passwordPrefix?: string
  ) {
    return cy.getAnyRandomNumber().then(randomNumber => {
      const password = testUserPassword(randomNumber, passwordPrefix);
      const testUser: UserData = {
        username: 'username-' + randomNumber,
        personnelNumber: 'personnelnumber-' + randomNumber,
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired,
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
