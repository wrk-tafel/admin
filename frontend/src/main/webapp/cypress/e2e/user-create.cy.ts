import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Create', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('create new user', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      const username = 'test-username-' + userRandomId;
      const personnelNumber = 'test-personnelNumber-' + userRandomId;
      fillUserForm(username, personnelNumber);

      cy.byTestId('passwordChangeRequiredInput').click();

      cy.byTestId('permission-checkbox-CHECKIN').click();

      cy.byTestId('permission-checkbox-USER_MANAGEMENT').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('usernameText').should('have.text', username);
      cy.byTestId('personnelNumberText').should('have.text', personnelNumber);
      cy.byTestId('nameText').should('have.text', 'test-lastname test-firstname');
    });
  });

  it('create new user with an email address, shown on the detail page', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      fillUserForm('test-username-' + userRandomId, 'test-personnelNumber-' + userRandomId);
      cy.byTestId('emailInput').type('user-' + userRandomId + '@example.org');

      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('emailText').should('have.text', 'user-' + userRandomId + '@example.org');
    });
  });

  it('the email address is optional, but must be well-formed when given', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      fillUserForm('test-username-' + userRandomId, 'test-personnelNumber-' + userRandomId);

      cy.byTestId('emailInput').type('kein-email').blur();
      cy.contains('mat-error', 'E-Mail-Format ungültig').should('be.visible');
      cy.byTestId('save-button').should('be.disabled');

      // emptying the field makes the form valid again - no address is a valid state
      cy.byTestId('emailInput').clear().blur();
      cy.byTestId('save-button').should('be.enabled').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('emailText').should('have.text', '-');
    });
  });

  it('create new user which exists already', () => {
    cy.visit('/benutzer/erstellen');

    // 1. Intercept the POST request that returns the 409 error
    // Replace '/api/users' with the actual endpoint URL your app uses
    cy.intercept('POST', '/api/users').as('createUserRequest');
    // 1. Suppress uncaught exceptions just for this test
    cy.once('uncaught:exception', (err) => !err.message.includes('409'));

    cy.getAnyRandomNumber().then(() => {
      fillUserForm('e2etest', 'e2etest');

      cy.byTestId('passwordChangeRequiredInput').click();
      cy.byTestId('permission-checkbox-CHECKIN').click();
      cy.byTestId('permission-checkbox-USER_MANAGEMENT').click();

      // 2. Click save - Cypress will no longer fail on the 409 error
      // because we are managing the request via intercept
      cy.byTestId('save-button').click();

      // 3. Wait for the request and verify the status (optional but recommended)
      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 409);

      // 4. Assert the UI feedback
      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Benutzer (Benutzername: e2etest) existiert bereits!');
    });
  });

  // A user carries its own personnel number, unique among users only - no employee is involved.
  it('create new user whose personnel number is taken by another user', () => {
    cy.visit('/benutzer/erstellen');

    cy.intercept('POST', '/api/users').as('createUserRequest');
    cy.once('uncaught:exception', (err) => !err.message.includes('409'));

    cy.getAnyRandomNumber().then((userRandomId) => {
      // '00000' is the personnel number of the e2etest fixture user
      fillUserForm('test-username-' + userRandomId, '00000');

      cy.byTestId('save-button').click();

      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 409);
      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Benutzer (Personalnummer: 00000) existiert bereits!');
    });
  });

  it('create new user with a password the backend rejects', () => {
    cy.visit('/benutzer/erstellen');

    cy.intercept('POST', '/api/users').as('createUserRequest');
    cy.once('uncaught:exception', (err) => !err.message.includes('400'));

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      fillPersonalData('test-personnelNumber-' + userRandomId);

      // "tafel" is one of the words the backend's password validator rejects outright (and it is
      // below the minimum length too) - the rejection has to come back as a 400 carrying its
      // message, not as a generic server error
      cy.byTestId('passwordInput').type('tafel');
      cy.byTestId('passwordRepeatInput').type('tafel');

      cy.byTestId('save-button').click();

      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 400);

      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Das neue Passwort ist ungültig!');
    });
  });

  it('permissions are grouped by category with a working select-all toggle', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      const username = 'test-username-' + userRandomId;
      const personnelNumber = 'test-personnelNumber-' + userRandomId;
      fillUserForm(username, personnelNumber);

      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 16 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle auswählen').click();

      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-DISTRIBUTION_LCM').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-CUSTOMER').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-CUSTOMER_DOCUMENTS').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-SCANNER').find('input').should('be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '5 von 16 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle abwählen');

      // toggling again deselects the whole group
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('not.be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 16 ausgewählt');

      // re-select the group so the created user has permissions to verify on the detail page
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('permission-group-Ausgabe & Betrieb').within(() => {
        cy.byTestId('permission-chip-CHECKIN').should('contain.text', 'Anmeldung');
        cy.byTestId('permission-chip-DISTRIBUTION_LCM').should('contain.text', 'Ausgabe-Ablauf');
        cy.byTestId('permission-chip-CUSTOMER').should('contain.text', 'Kundenverwaltung');
        cy.byTestId('permission-chip-CUSTOMER_DOCUMENTS').should('contain.text', 'Kunden-Dokumente');
        cy.byTestId('permission-chip-SCANNER').should('contain.text', 'Scanner');
      });
    });
  });

  it('password is required', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      fillPersonalData('test-personnelNumber-' + userRandomId);

      // leaving the password fields empty blocks saving and shows the validation message
      cy.byTestId('passwordInput').click();
      cy.byTestId('passwordRepeatInput').click().blur();

      cy.contains('mat-error', 'Pflichtfeld').should('be.visible');
      cy.byTestId('save-button').should('be.disabled');

      // filling the password enables saving again
      cy.byTestId('generate-password-button').click();
      cy.byTestId('save-button').should('be.enabled').click();

      cy.url().should('contain', '/benutzer/detail');
    });
  });

  // The personnel number and the name are plain fields of the account - no employee search, no
  // dialog, nothing to resolve.
  it('personnel number, lastname and firstname are plain required fields without an employee search', () => {
    cy.visit('/benutzer/erstellen');

    cy.byTestId('personnelNumberInput').should('be.visible');
    cy.byTestId('user-employee-search-button').should('not.exist');
    cy.byTestId('selectedEmployeeDescription').should('not.exist');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      cy.byTestId('generate-password-button').click();

      cy.byTestId('personnelNumberInput').click().blur();
      cy.byTestId('lastnameInput').click().blur();
      cy.byTestId('firstnameInput').click().blur();
      cy.contains('mat-error', 'Pflichtfeld').should('be.visible');
      cy.byTestId('save-button').should('be.disabled');

      // any free text is a valid personnel number as long as it is not taken by another user
      cy.byTestId('personnelNumberInput').type('never-searched');
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');
      cy.byTestId('save-button').should('be.enabled');
    });
  });

  it('personnel number, lastname and firstname are limited to 50 characters', () => {
    cy.visit('/benutzer/erstellen');

    // the browser stops the input at the limit, so a user can never enter a 51st character
    ['personnelNumberInput', 'lastnameInput', 'firstnameInput'].forEach((testId) => {
      cy.byTestId(testId).type('x'.repeat(51)).should('have.value', 'x'.repeat(50));
    });
  });

  it('generated password can be revealed, copied and defaults to requiring a change on next login', () => {
    cy.visit('/benutzer/erstellen');
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
    });

    cy.byTestId('passwordInput').should('have.attr', 'type', 'password');
    cy.byTestId('passwordChangeRequiredInput').find('input').should('be.checked');
    cy.byTestId('copy-password-button').should('not.exist');

    cy.byTestId('generate-password-button').click();

    // revealed in the clear, not masked
    cy.byTestId('passwordInput').should('have.attr', 'type', 'text').invoke('val').should('not.be.empty');
    cy.byTestId('passwordRepeatInput').should('have.attr', 'type', 'text');
    // still checked - generating a password doesn't accidentally clear the default
    cy.byTestId('passwordChangeRequiredInput').find('input').should('be.checked');

    cy.byTestId('copy-password-button').click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
  });

  it('password rules are shown next to the password fields', () => {
    cy.visit('/benutzer/erstellen');

    cy.byTestId('password-rules').should('be.visible').and('contain.text', 'Mindestens 8 Zeichen')
      .and('contain.text', 'Klein- und Großbuchstaben sowie eine Ziffer');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/benutzer/erstellen');

      cy.byTestId('usernameInput').should('be.visible').type('mobile-test-user');
      cy.byTestId('save-button').should('exist');
    });
  });

  function fillUserForm(username: string, personnelNumber: string) {
    cy.byTestId('usernameInput').type(username);
    fillPersonalData(personnelNumber);
    cy.byTestId('generate-password-button').click();
  }

  function fillPersonalData(personnelNumber: string) {
    cy.byTestId('personnelNumberInput').type(personnelNumber);
    cy.byTestId('lastnameInput').type('test-lastname');
    cy.byTestId('firstnameInput').type('test-firstname');
  }

});
