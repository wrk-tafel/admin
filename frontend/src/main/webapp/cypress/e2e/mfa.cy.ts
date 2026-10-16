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

  // A user who has the app on already proves it with a code of it (step 0) - a second method is only added by
  // someone who holds the first, see MfaService. The codes after it are asked for at step +1.
  function enableEmailThroughTheApi(appSecret?: string) {
    cy.request({method: 'POST', url: '/api/mfa/email/setup'});
    if (appSecret) {
      cy.task('totpCode', {secret: appSecret, stepOffset: 0}).then(currentCode =>
        cy.request({method: 'POST', url: '/api/mfa/email/enable', body: {code: EMAIL_CODE, currentCode}})
      );
    } else {
      cy.request({method: 'POST', url: '/api/mfa/email/enable', body: {code: EMAIL_CODE}});
    }
  }

  // A full session for a user who has the e-mail method: the password, then the code that is sent
  function loginByApiWithEmailCode(user: MfaUser) {
    cy.login(user.username, user.password);
    cy.request({method: 'POST', url: '/api/mfa/email/send'});
    cy.request({method: 'POST', url: '/api/mfa/verify', body: {code: EMAIL_CODE}});
  }

  // For a login made while a config reload may be in flight: the backend re-binds its configuration for a moment,
  // during which the mail settings read as absent and the e-mail method answers "not set up". The send is asked
  // for again until the reload has settled, and any other refusal still fails at once.
  function loginByApiWithEmailCodeAcrossReload(user: MfaUser, attempts = 10) {
    cy.login(user.username, user.password);
    cy.request({method: 'POST', url: '/api/mfa/email/send', failOnStatusCode: false}).then(response => {
      const reloading = response.status === 400 && JSON.stringify(response.body).includes('nicht eingerichtet');
      if (reloading && attempts > 1) {
        cy.wait(500);
        loginByApiWithEmailCodeAcrossReload(user, attempts - 1);
        return;
      }
      expect(response.status, 'the e-mail code was sent').to.eq(202);
      cy.request({method: 'POST', url: '/api/mfa/verify', body: {code: EMAIL_CODE}});
    });
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

  // The methods are rows that start closed; what a test does with a method happens inside its opened row
  function openRow(row: 'app' | 'email' | 'passkey') {
    cy.byTestId('mfaRowToggle-' + row).click();
    cy.byTestId('mfaRowPanel-' + row).should('be.visible');
  }

  // Every change but the very first setup is confirmed in the shared dialog, with a code of an existing method
  function confirmWithCode(code: string) {
    cy.byTestId('mfaConfirmDialog').should('be.visible');
    cy.byTestId('mfaConfirmCode').clear().type(code);
    cy.byTestId('mfaConfirmSubmit').click();
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
      cy.byTestId('mfaSummaryTitle').should('contain.text', 'nur durch das Passwort geschützt');
      openRow('app');
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
        cy.byTestId('mfaSummaryTitle').should('contain.text', '1 von 3 Methoden aktiv');
        cy.byTestId('mfaWarning').should('contain.text', 'Nur eine Methode');

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

        // ... and it can be removed again from its row, confirmed with a code
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
        openRow('app');
        cy.byTestId('mfaDisableTotpButton').click();
        cy.byTestId('mfaConfirmDialog').should('be.visible');
        cy.byTestId('mfaConfirmSendCodeButton').should('not.exist');
        cy.checkDialogAccessibility();
        cy.task('totpCode', {secret, stepOffset: 1}).then(code => confirmWithCode(code as string));
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

      openRow('app');
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

      openRow('app');
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
      openRow('email');
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
      cy.byTestId('mfaWarning').should('contain.text', 'Nur der Code per E-Mail');

      // the next login asks for the e-mailed code, which is sent as the page opens
      logoutThroughTheMenu();
      loginThroughThePage(user);
      cy.url().should('contain', '/login/mfa');
      cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');

      enterCode('000000');
      cy.byTestId('errorMessage').should('be.visible').and('contain.text', 'Der Code ist ungültig');
      enterCode(EMAIL_CODE);
      cy.url().should('contain', '/uebersicht');

      // removing it needs a code too: the e-mail is the only method, so the dialog sends one for it
      cy.visit('/konto/zwei-faktor');
      openRow('email');
      cy.byTestId('mfaDisableEmailButton').click();
      cy.byTestId('mfaConfirmSendCodeButton').click();
      cy.byTestId('mfaConfirmInfo').should('be.visible').and('contain.text', 'gesendet');
      cy.checkDialogAccessibility();
      confirmWithCode(EMAIL_CODE);
      cy.get('.toast-message').should('be.visible').and('contain.text', 'entfernt');
      cy.byTestId('mfaEmailStatus').should('have.text', 'Nicht aktiv');
    });
  });

  it('with both methods, either completes the login and the code page offers to send the e-mail', () => {
    createUser().then(user => {
      enableApp(user).then(secret => {
        enableEmailThroughTheApi(secret);

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
        cy.task('totpCode', {secret, stepOffset: 1}).then(code => enterCode(code as string));
        cy.url().should('contain', '/uebersicht');
      });
    });
  });

  // ---- changing the second factor takes an existing one

  it('adding the e-mail method next to the app asks for a code of the app', () => {
    createUser().then(user => {
      enableApp(user).then(secret => {
        cy.visit('/konto/zwei-faktor');

        openRow('email');
        cy.byTestId('mfaEmailSetupButton').click();
        cy.byTestId('mfaEmailCode').type(EMAIL_CODE);
        cy.checkAccessibility('main');
        cy.byTestId('mfaEmailEnableButton').click();

        // the code from the mail alone is not enough: the dialog asks for one of the app - which has it, so there
        // is no e-mail to send one by
        cy.byTestId('mfaConfirmDialog').should('be.visible');
        cy.byTestId('mfaConfirmSendCodeButton').should('not.exist');
        cy.byTestId('mfaConfirmSubmit').click();
        cy.contains('mat-error', 'Bitte den Code eingeben').should('be.visible');
        cy.checkDialogAccessibility();

        // a wrong one is refused, and the dialog stays open for another try
        confirmWithCode('000000');
        cy.byTestId('mfaConfirmError').should('be.visible').and('contain.text', 'Der Code ist ungültig');
        cy.byTestId('mfaEmailStatus').should('have.text', 'Wird eingerichtet');

        cy.task('totpCode', {secret, stepOffset: 0}).then(code => confirmWithCode(code as string));
        cy.byTestId('mfaConfirmDialog').should('not.exist');
        cy.get('.toast-message').should('be.visible').and('contain.text', 'eingerichtet');
        cy.byTestId('mfaEmailStatus').should('have.text', 'Aktiv');
      });
    });
  });

  it('adding the app next to the e-mail method asks for a code that is sent by e-mail', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      enableEmailThroughTheApi();
      loginByApiWithEmailCode(user);
      cy.visit('/konto/zwei-faktor');

      openRow('app');
      cy.byTestId('mfaSetupButton').click();
      cy.byTestId('mfaQrCode').find('svg').should('be.visible');
      cy.checkAccessibility('main');

      // the app code for the secret shown, and in the dialog the code that was sent for the method the user has
      cy.byTestId('mfaSecret').invoke('text').then(text => {
        cy.task('totpCode', {secret: text.replace(/\s/g, ''), stepOffset: 0}).then(code => cy.byTestId('mfaAppCode').type(code as string));
      });
      cy.byTestId('mfaEnableButton').click();
      cy.byTestId('mfaConfirmSendCodeButton').click();
      cy.byTestId('mfaConfirmInfo').should('be.visible').and('contain.text', 'gesendet');
      confirmWithCode(EMAIL_CODE);
      cy.get('.toast-message').should('be.visible').and('contain.text', 'eingerichtet');
      cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
    });
  });

  it('the address the e-mail method sends to cannot be changed without a code', () => {
    createUser().then(user => {
      cy.login(user.username, user.password);
      enableEmailThroughTheApi();
      loginByApiWithEmailCode(user);
      cy.visit('/konto/daten');

      // no code asked for while the address stays
      cy.byTestId('account-mfa-code').should('not.exist');
      cy.byTestId('account-email').clear().type('neue-adresse@example.org');
      cy.byTestId('account-code-hint').should('be.visible');
      cy.byTestId('account-mfa-code').should('be.visible');
      cy.checkAccessibility('main');

      // without a code it is not even sent
      cy.byTestId('account-save-button').click();
      cy.contains('mat-error', 'Bitte den Code eingeben').should('be.visible');

      // a wrong one is refused and the address stays what it was
      cy.byTestId('account-mfa-code').type('000000');
      cy.byTestId('account-save-button').click();
      cy.byTestId('account-error-message').should('be.visible').and('contain.text', 'Der Code ist ungültig');
      cy.request('/api/users/account').its('body.email').should('eq', user.username + '@example.org');

      // the code goes to the address on record, and with it the change is accepted - as a request the old
      // address still has to confirm (email-change.cy.ts follows that link)
      cy.byTestId('account-send-code-button').click();
      cy.byTestId('account-info-message').should('be.visible').and('contain.text', 'bisherige E-Mail-Adresse');
      cy.byTestId('account-mfa-code').type(EMAIL_CODE);
      cy.byTestId('account-save-button').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.request('/api/users/account').its('body').should('deep.include', {
        email: user.username + '@example.org',
        pendingEmail: 'neue-adresse@example.org'
      });
      cy.byTestId('account-pending-email').should('contain.text', 'neue-adresse@example.org');
      cy.byTestId('account-mfa-code').should('not.exist');
    });
  });

  it('a method can be removed with a code of the other one', () => {
    createUser().then(user => {
      enableApp(user).then(secret => {
        enableEmailThroughTheApi(secret);
        cy.visit('/konto/zwei-faktor');

        cy.byTestId('mfaTotpStatus').should('have.text', 'Aktiv');
        cy.byTestId('mfaEmailStatus').should('have.text', 'Aktiv');
        cy.byTestId('mfaSummaryTitle').should('contain.text', '2 von 3 Methoden aktiv');
        cy.byTestId('mfaWarning').should('not.exist');
        openRow('email');
        cy.byTestId('mfaDisableEmailButton').click();
        cy.task('totpCode', {secret, stepOffset: 1}).then(code => confirmWithCode(code as string));

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
        enableApp(user).then(secret => {
          enableEmailThroughTheApi(secret);
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
      loginByApiWithEmailCodeAcrossReload(requirementUser);
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

    it('sends a user with no method to the login flow\'s setup page - and nowhere else - until they did', () => {
      createUser().then(user => {
        setRequired(true);
        cy.login(user.username, user.password);
        cy.request({url: '/api/users/export', failOnStatusCode: false}).its('status').should('eq', 403);

        // every page leads to the setup page, which says why - as part of the login flow, not inside the application
        cy.visit('/uebersicht');
        cy.url().should('contain', '/login/mfa-einrichtung');
        cy.byTestId('mfaForcedBanner').should('be.visible').and('contain.text', 'verlangt eine Zwei-Faktor-Authentifizierung');
        cy.visit('/kunden/suchen');
        cy.url().should('contain', '/login/mfa-einrichtung');
        cy.visit('/konto/zwei-faktor');
        cy.url().should('contain', '/login/mfa-einrichtung');

        // setting a method up ends that
        cy.byTestId('mfaEmailSetupButton').click();
        cy.byTestId('mfaEmailCode').type(EMAIL_CODE);
        cy.byTestId('mfaEmailEnableButton').click();
        cy.url().should('contain', '/uebersicht');

        // and the last method cannot be switched off while it is required - the normal settings page works
        // normally again now that a method is set up
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaRequiredHint').should('be.visible');
        cy.byTestId('mfaLastMethodHint').should('be.visible');
        openRow('email');
        cy.byTestId('mfaDisableEmailButton').should('be.disabled');
      });
    });

    function clearEmail(user: MfaUser) {
      cy.login(user.username, user.password);
      cy.request('/api/users/account').then(({body}) => {
        cy.request({
          method: 'PUT',
          url: '/api/users/account',
          body: {firstname: body.firstname, lastname: body.lastname, email: null}
        });
      });
    }

    // ADR-0062: the address is now its own step, shown ahead of the method chooser and independent of it - it
    // does not, by itself, start the e-mail method any more (that stays a deliberate, separate click).
    it('lets a user with no e-mail address on record add one right on the setup page, then set up the e-mail method separately', () => {
      createUser().then(user => {
        clearEmail(user);

        setRequired(true);
        cy.login(user.username, user.password);
        cy.visit('/uebersicht');
        cy.url().should('contain', '/login/mfa-einrichtung');

        cy.byTestId('mfaEmailAddressHint').should('be.visible').and('contain.text', 'keine E-Mail-Adresse hinterlegt');
        cy.byTestId('mfaEmailSetupButton').should('not.exist');
        cy.byTestId('mfaEmailNoAddress').should('be.visible');
        cy.byTestId('mfaEmailAddressInput').type(user.username + '@example.org');
        cy.byTestId('mfaEmailAddressSaveButton').click();

        // the address is on record now, but the e-mail method itself is still a separate step
        cy.byTestId('mfaEmailAddressInput').should('not.exist');
        cy.byTestId('mfaEmailSetupButton').should('be.visible').click();
        cy.byTestId('mfaEmailCode').should('be.visible').type(EMAIL_CODE);
        cy.byTestId('mfaEmailEnableButton').click();
        cy.url().should('contain', '/uebersicht');
      });
    });

    it('sends a user who already has a method but no address to add one - and only that', () => {
      createUser().then(user => {
        // cleared before the app is set up: a session that owes a TOTP code cannot reach the account endpoints
        clearEmail(user);
        enableApp(user).then(secret => {
          setRequired(true);
          cy.login(user.username, user.password);
          cy.visit('/uebersicht');
          // the app is already set up, but it still owes its code before anything else
          cy.url().should('contain', '/login/mfa');
          cy.task('totpCode', {secret, stepOffset: 0}).then(code => enterCode(code as string));

          cy.url().should('contain', '/login/mfa-einrichtung');
          cy.byTestId('mfaForcedBanner').should('contain.text', 'verlangt eine hinterlegte E-Mail-Adresse für jedes Benutzerkonto');
          cy.byTestId('mfaSetupButton').should('not.exist');
          cy.byTestId('mfaEmailSetupButton').should('not.exist');
          cy.byTestId('mfaEmailAddressInput').type(user.username + '@example.org');
          cy.byTestId('mfaEmailAddressSaveButton').click();
          cy.url().should('contain', '/uebersicht');
        });
      });
    });

    it('refuses to blank out the e-mail address on "Meine Daten" while it is required', () => {
      createUser().then(user => {
        enableApp(user).then(secret => {
          setRequired(true);
          cy.login(user.username, user.password);
          cy.visit('/konto/daten');
          // the app is already set up, so a code is still owed before "Meine Daten" is reachable
          cy.url().should('contain', '/login/mfa');
          cy.task('totpCode', {secret, stepOffset: 0}).then(code => enterCode(code as string));
          cy.url().should('contain', '/uebersicht');
          cy.visit('/konto/daten');

          cy.byTestId('account-email').clear();
          cy.byTestId('account-save-button').click();

          cy.byTestId('account-error-message').should('be.visible').and('contain.text', 'E-Mail-Adresse');
        });
      });
    });

    it('has no accessibility violations on the setup page it leads to', () => {
      createUser().then(user => {
        setRequired(true);
        cy.login(user.username, user.password);
        cy.visit('/uebersicht');

        cy.byTestId('mfaForcedBanner').should('be.visible');
        cy.byTestId('mfaSetupButton').click();
        cy.byTestId('mfaQrCode').find('svg').should('be.visible');
        cy.checkAccessibility('main');
      });
    });
  });

  // ---- passkeys

  /**
   * The spec plays the device too: Chrome's virtual authenticator (DevTools protocol) answers the browser's
   * passkey prompts with real keys and signatures, and without a dialog - the user is taken to be present and
   * verified. It belongs to the browser tab, so it is switched off again after each test.
   */
  describe('passkeys', () => {

    function devTools(command: string, params: Record<string, unknown> = {}) {
      return cy.then(() => Cypress.automation('remote:debugger:protocol', {command, params}));
    }

    beforeEach(() => {
      devTools('WebAuthn.enable');
      devTools('WebAuthn.addVirtualAuthenticator', {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true
        }
      });
    });

    afterEach(() => {
      devTools('WebAuthn.disable');
    });

    // A session that has passed its second step, for a user whose method is the e-mailed code
    function userWithEmailMethod(): Cypress.Chainable<MfaUser> {
      return createUser().then(user => {
        cy.login(user.username, user.password);
        enableEmailThroughTheApi();
        return cy.wrap(user);
      });
    }

    function addPasskeyThroughThePage(name: string) {
      openRow('passkey');
      cy.byTestId('mfaPasskeyName').type(name);
      cy.byTestId('mfaPasskeyAddButton').click();
      cy.byTestId('mfaConfirmSendCodeButton').click();
      cy.byTestId('mfaConfirmInfo').should('be.visible').and('contain.text', 'gesendet');
      confirmWithCode(EMAIL_CODE);
      cy.get('.toast-message').should('be.visible').and('contain.text', 'Passkey hinzugefügt');
    }

    it('a passkey is added next to a code method, completes the next login, and stays when the code method goes', () => {
      userWithEmailMethod().then(user => {
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaPasskeyList').should('not.exist');

        addPasskeyThroughThePage('Laptop');
        // the virtual authenticator is built into the device (transport "internal")
        cy.byTestId('mfaPasskeyItem').should('contain.text', 'Laptop').and('contain.text', 'noch nicht verwendet');
        cy.byTestId('mfaPasskeyKind').should('contain.text', '(Gerät)');
        cy.byTestId('mfaPasskeyStatus').should('have.text', '1 eingerichtet');
        cy.checkAccessibility('main');

        // the next login offers the passkey first, and sends no e-mail nobody asked for
        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.byTestId('mfaPasskeyButton').should('be.visible');
        cy.byTestId('infoMessage').should('not.exist');
        cy.checkAccessibility('main');
        cy.byTestId('mfaPasskeyButton').click();
        cy.url().should('contain', '/uebersicht');

        // the code method can be removed: the passkey is a method of its own
        cy.visit('/konto/zwei-faktor');
        openRow('passkey');
        cy.byTestId('mfaPasskeyItem').should('contain.text', 'zuletzt verwendet');
        openRow('email');
        cy.byTestId('mfaDisableEmailButton').click();
        cy.byTestId('mfaConfirmSendCodeButton').click();
        cy.byTestId('mfaConfirmInfo').should('be.visible').and('contain.text', 'gesendet');
        confirmWithCode(EMAIL_CODE);
        cy.get('.toast-message').should('be.visible').and('contain.text', 'Code per E-Mail entfernt');
        cy.byTestId('mfaEmailStatus').should('have.text', 'Nicht aktiv');
        cy.byTestId('mfaWarning').should('contain.text', 'Nur ein Passkey');

        // with no code left to give, the passkey itself proves the change that removes it
        cy.get('[testid^="mfaRemovePasskeyButton-"]').click();
        cy.byTestId('mfaConfirmCode').should('not.exist');
        cy.byTestId('mfaConfirmPasskeyHint').should('contain.text', 'Passkeys');
        cy.checkDialogAccessibility();
        cy.byTestId('mfaConfirmSubmit').click();
        cy.get('.toast-message').should('be.visible').and('contain.text', 'Passkey entfernt');
        cy.byTestId('mfaPasskeyList').should('not.exist');
        cy.createLoginRequest(user.username, user.password).its('body').should('deep.include', {mfaRequired: false});
      });
    });

    it('the code still completes the login of a user who has a passkey', () => {
      userWithEmailMethod().then(user => {
        cy.visit('/konto/zwei-faktor');
        addPasskeyThroughThePage('Laptop');

        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.byTestId('mfaPasskeyButton').should('be.visible');

        cy.byTestId('sendEmailCodeButton').click();
        cy.byTestId('infoMessage').should('be.visible').and('contain.text', 'gesendet');
        enterCode(EMAIL_CODE);
        cy.url().should('contain', '/uebersicht');
      });
    });

    it('a passkey is the only method: added with a name alone, the login asks for nothing else, an administrator resets it', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        cy.visit('/konto/zwei-faktor');
        openRow('passkey');
        cy.byTestId('mfaPasskeyName').type('Laptop');
        cy.byTestId('mfaPasskeyAddButton').click();
        // the first method needs no proof, so no dialog asks for one
        cy.get('.toast-message').should('be.visible').and('contain.text', 'Passkey hinzugefügt');
        cy.byTestId('mfaConfirmDialog').should('not.exist');
        cy.byTestId('mfaPasskeyItem').should('contain.text', 'Laptop');

        logoutThroughTheMenu();
        loginThroughThePage(user);
        cy.url().should('contain', '/login/mfa');
        cy.byTestId('mfaCode').should('not.exist');
        cy.checkAccessibility('main');
        cy.byTestId('mfaPasskeyButton').click();
        cy.url().should('contain', '/uebersicht');

        // the way out when the device is gone
        cy.loginDefault();
        cy.visit('/benutzer/detail/' + user.id);
        cy.byTestId('mfaText').should('have.text', 'Aktiv (Passkey)');
        cy.byTestId('resetMfaButton').should('be.visible').click();
        cy.get('.toast-message').should('be.visible').and('contain.text', 'zurückgesetzt');
        cy.byTestId('mfaText').should('have.text', 'Nicht aktiv');
        cy.createLoginRequest(user.username, user.password).its('body').should('deep.include', {mfaRequired: false});
      });
    });

    it('adding a passkey next to a code method is refused with a wrong code', () => {
      userWithEmailMethod().then(() => {
        cy.visit('/konto/zwei-faktor');
        openRow('passkey');
        cy.byTestId('mfaPasskeyName').type('Laptop');
        cy.byTestId('mfaPasskeyAddButton').click();
        confirmWithCode('000000');
        cy.byTestId('mfaConfirmError').should('be.visible').and('contain.text', 'Der Code ist ungültig');
        cy.byTestId('mfaConfirmCancel').click();
        cy.byTestId('mfaPasskeyList').should('not.exist');
      });
    });
  });

  // ---- account page

  describe('account page', () => {

    it('has no accessibility violations with the rows closed, and open while the methods are being set up', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        cy.visit('/konto/zwei-faktor');
        cy.byTestId('mfaSummary').should('be.visible');
        cy.checkAccessibility('main');

        openRow('app');
        cy.byTestId('mfaSetupButton').click();
        cy.byTestId('mfaQrCode').find('svg').should('be.visible');
        openRow('email');
        cy.byTestId('mfaEmailSetupButton').click();
        cy.byTestId('mfaEmailCode').scrollIntoView().should('be.visible');
        openRow('passkey');
        cy.checkAccessibility('main');
      });
    });

    it('is reachable from the user menu', () => {
      createUser().then(user => {
        cy.login(user.username, user.password);
        cy.visit('/');

        cy.byTestId('usermenu').click();
        cy.byTestId('usermenu-account').click();
        cy.byTestId('account-nav-mfa').click();

        cy.url().should('contain', '/konto/zwei-faktor');
        cy.byTestId('mfaTotpStatus').should('be.visible');
      });
    });
  });
});
