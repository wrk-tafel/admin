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

  it('create new user with a password the backend rejects', () => {
    cy.visit('/benutzer/erstellen');

    cy.intercept('POST', '/api/users').as('createUserRequest');
    cy.once('uncaught:exception', (err) => !err.message.includes('400'));

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      linkEmployee('test-personnelNumber-' + userRandomId);

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

      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 14 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle auswählen').click();

      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-DISTRIBUTION_LCM').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-CUSTOMER').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-SCANNER').find('input').should('be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '4 von 14 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle abwählen');

      // toggling again deselects the whole group
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('not.be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 14 ausgewählt');

      // re-select the group so the created user has permissions to verify on the detail page
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('permission-group-Ausgabe & Betrieb').within(() => {
        cy.byTestId('permission-chip-CHECKIN').should('contain.text', 'Anmeldung');
        cy.byTestId('permission-chip-DISTRIBUTION_LCM').should('contain.text', 'Ausgabe-Ablauf');
        cy.byTestId('permission-chip-CUSTOMER').should('contain.text', 'Kundenverwaltung');
        cy.byTestId('permission-chip-SCANNER').should('contain.text', 'Scanner');
      });
    });
  });

  it('password is required', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      linkEmployee('test-personnelNumber-' + userRandomId);

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

  it('lastname/firstname are filled in from the linked employee and cleared when the link is removed', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      linkEmployee('test-personnelNumber-' + userRandomId);

      cy.byTestId('lastnameInput').should('have.value', 'employee-lastname');
      cy.byTestId('firstnameInput').should('have.value', 'employee-firstname');

      cy.byTestId('selectedEmployeeRemoveButton').click();

      cy.byTestId('lastnameInput').should('have.value', '');
      cy.byTestId('firstnameInput').should('have.value', '');
    });
  });

  it('personnel number can only be a real, resolved employee', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');
      cy.byTestId('generate-password-button').click();

      // an employee number never resolved through the search stays invalid, even though something
      // is typed into the field
      cy.byTestId('personnelNumberInput').type('never-searched');
      cy.byTestId('personnelNumberInput').blur();
      cy.contains('mat-error', 'Bitte einen Mitarbeiter über die Personalnummer-Suche auswählen').should('be.visible');
      cy.byTestId('save-button').should('be.disabled');

      // '00000' is the personnel number of the e2etest fixture employee - a single match resolves
      // straight away without any dialog
      cy.byTestId('personnelNumberInput').clear().type('00000');
      cy.byTestId('user-employee-search-button').click();
      cy.byTestId('personnelNumberInput').should('not.exist');
      cy.byTestId('selectedEmployeeDescription').should('have.text', '00000 E2E Test');
      cy.byTestId('save-button').should('be.enabled');

      // removing the link goes back to requiring a fresh search
      cy.byTestId('selectedEmployeeRemoveButton').click();
      cy.byTestId('personnelNumberInput').should('exist').and('have.value', '');
      cy.byTestId('save-button').should('be.disabled');
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

    cy.byTestId('password-rules').should('be.visible').and('contain.text', 'Mindestens 8 Zeichen');
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
    linkEmployee(personnelNumber);
    cy.byTestId('generate-password-button').click();
  }

  // Resolves the personnel-number field to a real employee via the search/create-if-missing widget,
  // rather than leaving it as unlinked free text - matching the driver/co-driver flow in
  // food-collection-recording.cy.ts. Branches on the actual search result rather than assuming "not
  // found", since a fixed personnel number (e.g. the 409-conflict test below) may already have been
  // created as an employee by an earlier run against the same database.
  function linkEmployee(personnelNumber: string) {
    cy.intercept('GET', '**/employees*').as('findEmployeesForLink');
    cy.byTestId('personnelNumberInput').type(personnelNumber);
    cy.byTestId('user-employee-search-button').click();

    cy.wait('@findEmployeesForLink').then((interception) => {
      const items = interception.response?.body?.items ?? [];
      if (items.length === 0) {
        cy.byTestId('user-search-create-dialog').within(() => {
          cy.byTestId('user-personnelnumber-input').type(personnelNumber);
          cy.byTestId('user-firstname-input').type('employee-firstname');
          cy.byTestId('user-lastname-input').type('employee-lastname');
          cy.byTestId('user-save-button').click();
        });
      } else if (items.length > 1) {
        cy.byTestId('user-select-employee-dialog').within(() => {
          cy.byTestId('select-employee-button-0').click();
        });
      }
    });

    cy.byTestId('selectedEmployeeDescription').should('contain.text', personnelNumber);
  }

});
