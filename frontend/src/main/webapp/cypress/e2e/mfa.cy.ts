import {testUserPassword} from '../support/commands';
import {PHONE_VIEWPORT} from '../support/viewports';

/**
 * Two-factor authentication: a code from an authenticator app and a code sent by e-mail, which a user can have
 * side by side, and the deployment-wide switch (`tafeladmin.mfa.required`) that requires one.
 *
 * The spec plays the authenticator app itself: the secret is read off the setup page and turned into a code by
 * the `totpCode` task (cypress.config.ts). The backend accepts the step before the current one, the current one
 * and the next, and each code only once - so the codes a spec uses are asked for in the order -1, 0, +1. There is
 * no mail server in an end-to-end run, so the e-mail method sends a fixed code instead (`EMAIL_CODE`,
 * `tafeladmin.mfa.emailCodeForTests` in application-e2e.yml).
 *
 * The lockout after too many wrong codes is not exercised here: the e2e profile raises the lockout for
 * failed attempts to 1000 so that unrelated specs cannot trip it. `MfaIT` covers it against the real
 * default limit.
 */
describe('Two-factor authentication', () => {

  const EMAIL_CODE = '424242';

  interface MfaUser {
    id: number;
    username: string;
    password: string;
  }

  // A user with a permission, so there is a dashboard to land on after the login - created by the
  // administrator, so this leaves that session behind and a spec logs in as the new user itself
  function createUser(permission = {key: 'CUSTOMER', title: 'Kundenverwaltung'}): Cypress.Chainable<MfaUser> {
    cy.loginDefault();
    return cy.getAnyRandomNumber().then(number => {
      const password = testUserPassword(number);
      const username = 'mfa-user-' + number;
      return cy.createUser({
        username,
        personnelNumber: 'mfa-' + number,
        firstname: 'firstname-' + number,
        lastname: 'lastname-' + number,
        email: username + '@example.org',
        enabled: true,
        password,
        passwordRepeat: password,
        passwordChangeRequired: false,
        permissions: [{...permission, category: 'Ausgabe & Betrieb'}]
      }).then(response => ({id: response.body.id!, username, password}));
    });
  }

  // Switches the app on through the API - the flow through the page itself is what the first test covers
  function enableApp(user: MfaUser): Cypress.Chainable<string> {
    cy.login(user.username, user.password);
    return cy.request({method: 'POST', url: '/api/mfa/setup'}).then(setup => {
      const secret: string = setup.body.secret;
      return cy.task('totpCode', {secret, stepOffset: -1}).then(code =>
        cy.request({method: 'POST', url: '/api/mfa/enable', body: {code}}).then(() => secret)
      );
    });
  }

  function enableEmailThroughTheApi() {
    cy.request({method: 'POST', url: '/api/mfa/email/setup'});
    cy.request({method: 'POST', url: '/api/mfa/email/enable', body: {code: EMAIL_CODE}});
  }

  // A full session for a user who has the e-mail method: the password, then the code that is sent
  function loginByApiWithEmailCode(user: MfaUser) {
    cy.login(user.username, user.password);
    cy.request({method: 'POST', url: '/api/mfa/email/send'});
    cy.request({method: 'POST', url: '/api/mfa/verify', body: {code: EMAIL_CODE}});
  }

  function loginThroughThePage(user: MfaUser) {
    cy.visit('/login');
    cy.byTestId('username').type(user.username);
    cy.byTestId('password').type(user.password);
    cy.byTestId('loginButton').click();
  }

  function enterCode(code: string) {
    cy.byTestId('mfaCode').clear().type(code);
    cy.byTestId('mfaSubmit').click();
  }

  function logoutThroughTheMenu() {
    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-logout').click();
  }

  // ---- authenticator app

  it('the app is set up on the account page, asked for at the next login, and can be switched off again', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      cy.visit('/konto/zwei-faktor');

      cy.byTestId('mfaTotpStatus').should('have.text', 'Nicht aktiv');
      cy.byTestId('mfaSetupButton').click();
      cy.byTestId('mfaQrCode').find('svg').should('be.visible');
      cy.byTestId('mfaStoreLinkGoogle').should('have.attr', 'href').and('contain', 'play.google.com');
      cy.byTestId('mfaStoreLinkApple').should('have.attr', 'href').and('contain', 'apps.apple.com');
      cy.byTestId('mfaSecret').invoke('text').then(text => {
        const secret = text.replace(/\s/g, '');
        cy.task('totpCode', {secret, stepOffset: -1}).then(code => {
          cy.byTestId('mfaAppCode').type(code as string);
        });
        cy.byTestId('mfaEnableButton').click();
        cy.get('.toast-message').should('be.visible').and('contain.text', 'eingerichtet');
        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');

        // the next login asks for a code after the password ...
        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.byTestId('sendEmailCodeButton').should('not.exist');

        enterCode('000000');
        cy.byTestId('errorMessage').should('be.visible').and('contain.text', 'Der Code ist ungültig');
        cy.url().should('contain', '/login/mfa');

        cy.task('totpCode', {secret, stepOffset: 0}).then(code => enterCode(code as string));
        cy.url().should('contain', '/uebersicht');

        // ... and it can be switched off again, with a code
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
        cy.task('totpCode', {secret, stepOffset: 1}).then(code => cy.byTestId('mfaDisableCode').type(code as string));
        cy.byTestId('mfaDisableTotpButton').click();
        cy.get('.toast-message').should('be.visible').and('contain.text', 'entfernt');
        cy.byTestId('mfaTotpStatus').should('have.text', 'Nicht aktiv');

        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/uebersicht');
      });
    });
  });

  it('refuses a wrong code when setting the app up, and stays in the setup', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      cy.visit('/konto/zwei-faktor');

      cy.byTestId('mfaSetupButton').click();
      cy.byTestId('mfaAppCode').type('000000');
      cy.byTestId('mfaEnableButton').click();

      cy.byTestId('errorMessage').should('be.visible').and('contain.text', 'Der Code ist ungültig');
      cy.byTestId('mfaTotpStatus').should('have.text', 'Wird eingerichtet');

      // backing out leaves it off
      cy.byTestId('mfaCancelButton').click();
      cy.byTestId('mfaTotpStatus').should('have.text', 'Nicht aktiv');
    });
  });

  it('validates the code before sending it', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      cy.visit('/konto/zwei-faktor');
      cy.intercept('POST', '/api/mfa/enable').as('enable');

      cy.byTestId('mfaSetupButton').click();
      cy.byTestId('mfaAppCode').type('12345').blur();
      cy.contains('mat-error', 'Der Code besteht aus 6 Ziffern').should('be.visible');
      cy.byTestId('mfaEnableButton').click();

      cy.get('@enable.all').should('have.length', 0);
    });
  });

  // ---- e-mail

  it('the e-mail method is set up with a code that is sent, asked for at the next login, and can be switched off', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      cy.visit('/konto/zwei-faktor');

      cy.byTestId('mfaEmailStatus').should('have.text', 'Nicht aktiv');
      cy.byTestId('mfaEmailSetupButton').click();
      cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');
      cy.byTestId('mfaEmailStatus').should('have.text', 'Wird eingerichtet');

      cy.byTestId('mfaEmailCode').type('000000');
      cy.byTestId('mfaEmailEnableButton').click();
      cy.byTestId('errorMessage').should('be.visible').and('contain.text', 'Der Code ist ungültig');

      cy.byTestId('mfaEmailCode').clear().type(EMAIL_CODE);
      cy.byTestId('mfaEmailEnableButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'eingerichtet');
      cy.byTestId('mfaEmailStatus').should('have.text', 'Aktiv');

      // the next login asks for the e-mailed code, which is sent as the page opens
      logoutThroughTheMenu();
      loginThroughThePage(user);
      cy.url().should('contain', '/login/mfa');
      cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');

      enterCode('000000');
      cy.byTestId('errorMessage').should('be.visible').and('contain.text', 'Der Code ist ungültig');
      enterCode(EMAIL_CODE);
      cy.url().should('contain', '/uebersicht');

      // switching it off needs a code too: the e-mail is the only method, so one is sent for it
      cy.visit('/konto/zwei-faktor');
      cy.byTestId('mfaSendDisableCodeButton').click();
      cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');
      cy.byTestId('mfaDisableCode').type(EMAIL_CODE);
      cy.byTestId('mfaDisableEmailButton').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'entfernt');
      cy.byTestId('mfaEmailStatus').should('have.text', 'Nicht aktiv');
    });
  });

  it('with both methods, either completes the login and the code page offers to send the e-mail', () => {
    createUser().then(user => {
      enableApp(user).then(secret => {
        enableEmailThroughTheApi();

        // by e-mail: the code is sent on request, not on its own
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.byTestId('infoMessage').should('not.exist');
        cy.byTestId('sendEmailCodeButton').click();
        cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');
        enterCode(EMAIL_CODE);
        cy.url().should('contain', '/uebersicht');

        // by app
        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.task('totpCode', {secret, stepOffset: 0}).then(code => enterCode(code as string));
        cy.url().should('contain', '/uebersicht');
      });
    });
  });

  it('a method can be switched off with a code of the other one', () => {
    createUser().then(user => {
      enableApp(user).then(secret => {
        enableEmailThroughTheApi();
        cy.visit('/konto/zwei-faktor');

        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
        cy.byTestId('mfaEmailStatus').should('have.text', 'Aktiv');
        cy.task('totpCode', {secret, stepOffset: 0}).then(code => cy.byTestId('mfaDisableCode').type(code as string));
        cy.byTestId('mfaDisableEmailButton').click();

        cy.byTestId('mfaEmailStatus').should('have.text', 'Nicht aktiv');
        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
      });
    });
  });

  // ---- a login that still owes its code

  describe('a login that still owes its code', () => {

    it('is stuck on the code page: nothing else opens, not even what needs no permission', () => {
      createUser().then(user => {
        enableApp(user);

        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');

        // the password-only session is refused everything but handing the code in
        cy.request({url: '/api/users/export', failOnStatusCode: false}).its('status').should('eq', 403);
        cy.request({url: '/api/mfa', failOnStatusCode: false}).its('status').should('eq', 403);
        cy.request({url: '/api/households/search', method: 'POST', body: {}, failOnStatusCode: false}).its('status').should('eq', 403);
        cy.request('/api/users/info').its('body').should('deep.include', {mfaPending: true, permissions: []});

        // and a page inside the application sends it back to the code page
        cy.visit('/uebersicht');
        cy.url().should('contain', '/login/mfa');
      });
    });

    it('is not shown without a login: opening the address by hand leads to the login page', () => {
      cy.visit('/login/mfa');

      cy.url().should('not.contain', '/login/mfa');
      cy.byTestId('loginButton').should('be.visible');
      cy.byTestId('mfaCode').should('not.exist');
    });

    it('is not shown once nothing is owed any more: opening the address by hand leads into the application', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        enableEmailThroughTheApi();
        loginByApiWithEmailCode(user);

        cy.visit('/login/mfa');

        cy.url().should('not.contain', '/login/mfa');
        cy.byTestId('mfaCode').should('not.exist');
      });
    });

    it('can be given up, which ends the session', () => {
      createUser().then(user => {
        enableApp(user);
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');

        cy.byTestId('cancelButton').click();

        cy.url().should('contain', '/login');
        cy.url().should('not.contain', '/login/mfa');
        cy.request({url: '/api/users/info', failOnStatusCode: false}).its('status').should('eq', 401);
      });
    });

    it('has no accessibility violations', () => {
      createUser().then(user => {
        enableApp(user);
        loginThroughThePage(user);

        cy.byTestId('mfaCode').should('be.visible');
        cy.checkAccessibility('main');
      });
    });

    it('remains usable on mobile viewports', () => {
      createUser().then(user => {
        enableApp(user);
        cy.viewport(PHONE_VIEWPORT);
        loginThroughThePage(user);

        cy.byTestId('mfaCode').should('be.visible');
        cy.byTestId('mfaSubmit').should('be.visible');
      });
    });
  });

  // ---- administrator

  describe('for an administrator', () => {

    beforeEach(() => {
      cy.loginDefault();
    });

    it('shows which methods a user has, and resets them for someone who lost the phone', () => {
      createUser().then(user => {
        enableApp(user).then(() => {
          enableEmailThroughTheApi();
          cy.loginDefault();
          cy.visit('/benutzer/detail/' + user.id);
          cy.byTestId('mfaText').should('have.text', 'Aktiv (Authenticator-App, Code per E-Mail)');

          // next to the state it resets, not hidden in the status menu
          cy.byTestId('resetMfaButton').should('be.visible').click();

          cy.get('.toast-message').should('be.visible').and('contain.text', 'zurückgesetzt');
          cy.byTestId('mfaText').should('have.text', 'Nicht aktiv');
          cy.byTestId('resetMfaButton').should('not.exist');

          // a password is enough again
          cy.createLoginRequest(user.username, user.password).its('body').should('deep.include', {mfaRequired: false});
        });
      });
    });

    it('offers no reset for someone who has it off', () => {
      createUser().then(user => {
        cy.visit('/benutzer/detail/' + user.id);

        cy.byTestId('mfaText').should('have.text', 'Nicht aktiv');
        cy.byTestId('resetMfaButton').should('not.exist');
        cy.byTestId('changeUserStateButton').click();
        cy.byTestId('disableUserButton').should('be.visible');
        cy.byTestId('resetMfaButton').should('not.exist');
      });
    });
  });

  // ---- the deployment requires it

  describe('when the deployment requires it', () => {

    // Turning the requirement on affects every user, the default test administrator included - who has no method
    // and could then do nothing but set one up. So the requirement is switched through the backend's config file
    // (`tafeladmin.mfa.required`, re-read while the application runs), which needs no session, and the wait for it to
    // arrive is done as a user of its own who has the e-mail method. It is always switched off again in `after`,
    // whatever a test did.
    let requirementUser: MfaUser;

    function untilRequirementIs(required: boolean, attempts = 30) {
      cy.request('/api/mfa').then(({body}) => {
        if (body.required !== required) {
          expect(attempts, 'the config reload picked the requirement up').to.be.greaterThan(0);
          cy.wait(500);
          untilRequirementIs(required, attempts - 1);
        }
      });
    }

    function setRequired(required: boolean) {
      if (required) {
        cy.task('writeBackendConfig', ['tafeladmin:', '  mfa:', '    required: true'].join('\n'));
      } else {
        cy.task('clearBackendConfig');
      }
      loginByApiWithEmailCode(requirementUser);
      untilRequirementIs(required);
    }

    before(() => {
      createUser().then(user => {
        requirementUser = user;
        cy.login(user.username, user.password);
        enableEmailThroughTheApi();
      });
    });

    // a test that leaves it on would stop the next one from creating its user as the default administrator
    beforeEach(() => {
      setRequired(false);
    });

    after(() => {
      setRequired(false);
    });

    it('sends a user with no method to set one up - and nowhere else - until they did', () => {
      createUser().then(user => {
        setRequired(true);
        cy.login(user.username, user.password);
        cy.request({url: '/api/users/export', failOnStatusCode: false}).its('status').should('eq', 403);

        // every page leads to the setup page, which says why
        cy.visit('/uebersicht');
        cy.url().should('contain', '/konto/zwei-faktor');
        cy.byTestId('mfaForcedBanner').should('be.visible').and('contain.text', 'verlangt eine Zwei-Faktor-Authentifizierung');
        cy.visit('/kunden/suchen');
        cy.url().should('contain', '/konto/zwei-faktor');

        // setting a method up ends that
        cy.byTestId('mfaEmailSetupButton').click();
        cy.byTestId('mfaEmailCode').type(EMAIL_CODE);
        cy.byTestId('mfaEmailEnableButton').click();
        cy.url().should('contain', '/uebersicht');

        // and the last method cannot be switched off while it is required
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaForcedBanner').should('not.exist');
        cy.byTestId('mfaRequiredHint').should('be.visible');
        // far down the page: Cypress counts what is scrolled out of the content area as hidden, so bring it in first
        cy.byTestId('mfaLastMethodHint').scrollIntoView().should('be.visible');
        cy.byTestId('mfaDisableEmailButton').should('be.disabled');
      });
    });

    it('has no accessibility violations on the setup page it leads to', () => {
      createUser().then(user => {
        setRequired(true);
        cy.login(user.username, user.password);
        cy.visit('/uebersicht');

        cy.byTestId('mfaForcedBanner').should('be.visible');
        cy.checkAccessibility('main');
      });
    });
  });

  // ---- account page

  describe('account page', () => {

    it('has no accessibility violations while the methods are being set up', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        cy.visit('/konto/zwei-faktor');

        cy.byTestId('mfaSetupButton').click();
        cy.byTestId('mfaQrCode').find('svg').should('be.visible');
        cy.byTestId('mfaEmailSetupButton').click();
        cy.byTestId('mfaEmailCode').scrollIntoView().should('be.visible');
        cy.checkAccessibility('main');
      });
    });

    it('is reachable from the user menu', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        cy.visit('/');

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-account').click();
        cy.byTestId('account-tab-mfa').click();

        cy.url().should('contain', '/konto/zwei-faktor');
        cy.byTestId('mfaTotpStatus').should('be.visible');
      });
    });
  });
});
