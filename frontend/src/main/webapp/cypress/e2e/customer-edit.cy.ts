import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {Gender} from '../support/commands';

const AUSTRIA = {id: 165, code: 'AT', name: 'Österreich'};

describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginE2ETest2();
  });

  it('customer updated', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      cy.visit('/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      // The stored validUntil (+1 year) must survive an edit that never touches income/incomeDue -
      // opening the form must not silently rewrite it from incomeDue (+30 days). Captured up front
      // and read back inside a `.should()` callback further down - a plain value argument would be
      // read while the commands below are still being queued, before this `.then()` has run.
      let expectedValidUntil: string;
      cy.byTestId('validUntilInput').invoke('val').then((value) => {
        expectedValidUntil = dayjs(value as string).format('DD.MM.YYYY');
      });

      const updatedLastname = 'UpdatedLastname';
      const updatedFirstname = 'UpdatedFirstname';
      const updatedTelephoneNumber = '0699111222333';
      const updatedEmail = 'updated.customer@test.com';
      const updatedEmployer = 'Updated Employer';
      const updatedStreet = 'Updated Street';
      const updatedHouseNumber = '99B';
      const updatedCity = 'Updated City';
      const updatedPostalCode = '5678';

      const typeInto = (testId: string, value: string) => {
        const input = cy.byTestId(testId);
        input.clear();
        input.type(value);
      };

      typeInto('lastnameInput', updatedLastname);
      typeInto('firstnameInput', updatedFirstname);
      typeInto('telephoneNumberInput', updatedTelephoneNumber);
      typeInto('emailInput', updatedEmail);
      typeInto('employerInput', updatedEmployer);
      typeInto('streetInput', updatedStreet);
      typeInto('houseNumberInput', updatedHouseNumber);
      typeInto('cityInput', updatedCity);
      typeInto('postalCodeInput', updatedPostalCode);
      cy.byTestId('genderInput').click();
      cy.byTestId('genderInput-option-FEMALE').click();

      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-dialog').should('be.visible');
      // the dialog exists only after the validation, so no other accessibility gate sees it -
      // see cypress/support/accessibility.ts
      cy.checkDialogAccessibility();

      cy.byTestId('validationresult-dialog')
        .within(() => {
          cy.byTestId('ok-button').click();
        });
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/kunden/detail/' + customerId);

      cy.byTestId('nameText').should('have.text', updatedLastname + ' ' + updatedFirstname);
      cy.byTestId('genderText').should('have.text', 'Weiblich');
      cy.byTestId('telephoneNumberText').should('have.text', updatedTelephoneNumber);
      cy.byTestId('emailText').should('have.text', updatedEmail);
      cy.byTestId('employerText').should('have.text', updatedEmployer);
      cy.byTestId('addressLine1Text').should('have.text', updatedStreet + ' ' + updatedHouseNumber);
      cy.byTestId('addressLine2Text').should('have.text', updatedPostalCode + ' ' + updatedCity);
      cy.byTestId('validUntilText').should(($el) => {
        expect($el.text()).to.equal(expectedValidUntil);
      });
    });
  });

  it('customer invalid and saved but invalid', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;
      cy.visit('/kunden/bearbeiten/' + customerId);

      cy.byTestId('save-button').should('be.enabled');

      const incomeInput = cy.byTestId('incomeInput');
      incomeInput.clear();
      incomeInput.type('10000');

      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Kein Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'dialog-header-danger');
          cy.byTestId('ok-button').click();
        });

      cy.byTestId('save-button').click();

      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet');

      cy.url().should('contain', '/kunden/detail/' + customerId);
    });
  });

  // Regression test for issue #3557: a locked customer reached directly by URL (the search screen's
  // edit pencil is disabled for one, but the route itself is still reachable) must show the lock and
  // refuse to save, so the lock can never be silently dropped by an edit.
  it('shows the lock banner and refuses to save a locked customer opened by direct URL', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        country: AUSTRIA,
        validUntil: dayjs().add(1, 'year').toDate(),
        locked: true,
        lockReason: 'Testgrund-' + randomNumber,
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        }
      }).then((response) => {
        const customer = response.body.data;
        cy.visit('/kunden/bearbeiten/' + customer.id);

        cy.byTestId('lock-info-banner').should('be.visible').and('contain.text', customer.lockReason);
        cy.byTestId('save-button').should('be.disabled');
      });
    });
  });

  it('remains usable on mobile viewports', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id;

      [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
        cy.viewport(viewport);
        cy.visit('/kunden/bearbeiten/' + customerId);

        cy.byTestId('lastnameInput').should('be.visible');
        cy.byTestId('save-button').should('be.enabled');
      });
    });
  });

  describe('Supervisor', () => {

    beforeEach(() => {
      cy.loginDefault();
    });

    it('supervisor should be able to force update customer', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id;
        cy.visit('/kunden/bearbeiten/' + customerId);

        // Set income within limits
        const incomeInput = cy.byTestId('incomeInput');
        incomeInput.clear();
        incomeInput.type('15000');

        cy.byTestId('save-button').click();

        cy.byTestId('confirm-customer-save-dialog')
          .should('be.visible')
          .within(() => {
            cy.byTestId('title').contains('Kunde speichern');
            cy.byTestId('message').contains('Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)');
            cy.byTestId('header').should('have.class', 'dialog-header-warning');
            cy.byTestId('ok-button').click();
          });

        // Should navigate to detail page after successful save
        cy.url().should('contain', '/kunden/detail/' + customerId);
      });
    });
  });

});
