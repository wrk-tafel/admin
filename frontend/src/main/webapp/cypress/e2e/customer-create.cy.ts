import {CustomerAddPersonData, Gender} from '../support/commands';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Customer Creation', () => {

  beforeEach(() => {
    cy.loginE2ETest2();
    cy.visit('/kunden/anlegen');
  });

  it('create new qualified customer', () => {
    createCustomer();

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'dialog-header-success');
      });
    // the dialog exists only after the validation, so no other accessibility gate sees it -
    // see cypress/support/accessibility.ts
    cy.checkDialogAccessibility();
    cy.byTestId('validationresult-dialog').within(() => {
      cy.byTestId('ok-button').click();
    });

    cy.byTestId('save-button').click();

    cy.url().should('include', '/kunden/detail');
  });

  it('breaks the validation result down into the amounts it was calculated from', () => {
    createCustomer();

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        // the two adults' income; the 3-year-old has none and the 8-year-old is not in the household
        cy.byTestId('detail-income').should('contain.text', '1.000,00');
        // the 8-year-old is not in the household, so nothing of theirs is counted - only the
        // 3-year-old's "ab 3" tier plus the flat child tax allowance
        cy.byTestId('detail-familyallowance').should('contain.text', '148,00');
        cy.byTestId('detail-childtaxallowance').should('contain.text', '70,90');
        // one child in the household, and the sibling addition starts at two
        cy.byTestId('detail-siblingaddition').should('contain.text', '0,00');
        cy.byTestId('total-income').should('contain.text', '1.218,90');

        // 2 adults and 1 child in the household, none of them beyond the base household size
        cy.byTestId('detail-baselimit')
          .should('contain.text', 'Grundbetrag (2 Erw., 1 Kind)')
          .and('contain.text', '3.289,00');
        cy.byTestId('detail-additionaladults').should('not.exist');
        cy.byTestId('detail-additionalchildren').should('not.exist');
        cy.byTestId('detail-tolerance').should('contain.text', '100,00');
        cy.byTestId('total-limit').should('contain.text', '3.389,00');

        cy.byTestId('amount-exceeded').should('contain.text', '0,00');
        cy.byTestId('ok-button').click();
      });
  });

  it('create new customer not qualified and save denied', () => {
    createCustomer(10000);

    cy.byTestId('validationresult-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Kein Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'dialog-header-danger');
        cy.byTestId('ok-button').click();
      });

    cy.byTestId('save-button').should('be.enabled');
    cy.byTestId('save-button').click();

    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet');

    cy.url().should('include', '/kunden/detail');
  });

  it('reports a household composition that has no configured income limit', () => {
    // a household of one child and no adult - no income limit is configured for that composition,
    // and reading that as a limit of 0,00 would deny the household its eligibility silently
    enterCustomerData(10);
    cy.byTestId('incomeInput').type('500');

    cy.byTestId('validate-button').click();

    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 0, Kinder: 1)!');
    cy.byTestId('validationresult-dialog').should('not.exist');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('lastnameInput').should('be.visible').type('Mustermann');
      cy.byTestId('save-button').should('exist');
    });
  });

  it('shows a live eligibility summary that updates without clicking Anspruch prüfen', () => {
    enterCustomerData();

    cy.byTestId('eligibility-summary').should('be.visible');
    cy.byTestId('eligibility-status').should('contain.text', 'Anspruch vorhanden');
    cy.byTestId('eligibility-personcount').should('contain.text', '1');

    cy.byTestId('incomeInput').type('10000');
    // the debounced /households/validate call needs a moment before the summary catches up
    cy.byTestId('eligibility-status', {timeout: 8000}).should('contain.text', 'Kein Anspruch vorhanden');
    cy.byTestId('eligibility-amount').should('be.visible');
  });

  it('shows an early duplicate warning once lastname, firstname and birthdate match an existing customer', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const birthDate = getBirthDateForAge(40);
      const lastname = 'Mustermann' + randomNumber;
      const firstname = 'Max' + randomNumber;

      cy.createCustomer({
        firstname,
        lastname,
        birthDate,
        gender: Gender.MALE,
        country: {id: 165, code: 'AT', name: 'Österreich'},
        telephoneNumber: '0123456789',
        email: 'existing.customer@test.com',
        employer: 'employer',
        income: 500,
        address: {street: 'Teststraße', houseNumber: '1', city: 'Wien', postalCode: 1010},
        validUntil: dayjs().add(1, 'year').toDate()
      }).then((response) => {
        const existingCustomerId = response.body.data.id;

        cy.byTestId('possible-duplicates-warning').should('not.exist');

        cy.byTestId('lastnameInput').type(lastname);
        cy.byTestId('firstnameInput').type(firstname);
        cy.byTestId('birthDateInput').type(dayjs(birthDate).format('YYYY-MM-DD'));

        cy.byTestId('possible-duplicates-warning', {timeout: 8000}).should('be.visible');
        cy.byTestId('possible-duplicate-' + existingCustomerId)
          .should('be.visible')
          .and('contain.text', lastname)
          .and('contain.text', firstname);

        cy.byTestId('possible-duplicate-' + existingCustomerId).find('a').click();
        // the typed identity fields count as unsaved changes, so the guard asks before leaving
        cy.byTestId('unsavedchanges-dialog').within(() => {
          cy.byTestId('ok-button').click();
        });
        cy.url().should('include', '/kunden/detail/' + existingCustomerId);
      });
    });
  });

  it('blocks saving an exact duplicate until the operator confirms, then saves it anyway', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const birthDate = getBirthDateForAge(45);
      const lastname = 'Bereits' + randomNumber;
      const firstname = 'Vorhanden' + randomNumber;

      cy.createCustomer({
        firstname,
        lastname,
        birthDate,
        gender: Gender.MALE,
        country: {id: 165, code: 'AT', name: 'Österreich'},
        telephoneNumber: '0123456789',
        email: 'existing.duplicate@test.com',
        employer: 'employer',
        income: 500,
        address: {street: 'Duplikatstraße', houseNumber: '1', city: 'Wien', postalCode: 1010},
        validUntil: dayjs().add(1, 'year').toDate()
      }).then((response) => {
        const existingCustomerId = response.body.data.id;

        // the same name+birthdate+address as the customer just created above via the API
        cy.byTestId('lastnameInput').type(lastname);
        cy.byTestId('firstnameInput').type(firstname);
        cy.byTestId('birthDateInput').type(dayjs(birthDate).format('YYYY-MM-DD'));
        cy.byTestId('genderInput').click();
        cy.byTestId('genderInput-option-MALE').click();
        cy.byTestId('countryInput').click();
        cy.byTestId('countryInput-option-165').click();
        cy.byTestId('telephoneNumberInput').type('0664123132123');
        cy.byTestId('streetInput').type('Duplikatstraße');
        cy.byTestId('houseNumberInput').type('1');
        cy.byTestId('postalCodeInput').type('1010');
        cy.byTestId('cityInput').type('Wien');
        cy.byTestId('employerInput').type('Test Employer');
        cy.byTestId('validUntilInput').type(dayjs().add(2, 'years').startOf('day').format('YYYY-MM-DD'));

        cy.byTestId('save-button').should('be.enabled').click();

        cy.byTestId('confirm-customer-save-dialog')
          .should('be.visible')
          .within(() => {
            cy.byTestId('title').contains('Kunde speichern');
            cy.byTestId('message')
              .contains('Möglicherweise bereits vorhanden')
              .and('contain.text', 'Kunde Nr. ' + existingCustomerId);
            cy.byTestId('header').should('have.class', 'dialog-header-warning');
            cy.byTestId('ok-button').click();
          });

        cy.url().should('include', '/kunden/detail');
      });
    });
  });

  it('renders additional persons as expansion panels, auto-expanding only the newly-added one', () => {
    enterAdditionalPersonData(0, {
      id: 0,
      key: 0,
      receivesFamilyAllowance: false,
      lastname: 'Add',
      firstname: 'Adult 1',
      birthDate: getBirthDateForAge(30),
      gender: Gender.MALE,
      employer: 'test employer',
      income: 500,
      country: {id: 1, code: 'AF', name: 'Afghanistan'},
      excludeFromHousehold: false
    });
    cy.byTestId('personform-0').should('be.visible');
    cy.byTestId('personform-header-0').should('contain.text', 'Add Adult 1');

    enterAdditionalPersonData(1, {
      id: 1,
      key: 1,
      receivesFamilyAllowance: true,
      lastname: 'Add',
      firstname: 'Child 1',
      birthDate: getBirthDateForAge(3),
      gender: Gender.FEMALE,
      income: 0,
      country: {id: 2, code: 'EG', name: 'Ägypten'},
      excludeFromHousehold: false
    });

    // only the newly-added person (index 1) stays open - the first one collapses back into its summary line
    cy.byTestId('personform-1').should('be.visible');
    cy.byTestId('personform-0').should('not.be.visible');
    cy.byTestId('personform-header-1').should('contain.text', 'Add Child 1').and('contain.text', 'Familienbeihilfe');

    // clicking a collapsed header re-opens it
    cy.byTestId('personform-header-0').click();
    cy.byTestId('personform-0').should('be.visible');
  });

  it('"Gültig bis" quick-picks add the given number of months from today', () => {
    cy.byTestId('validUntilQuickPick-6m').click();
    cy.byTestId('validUntilInput').should('have.value', dayjs().add(6, 'months').format('YYYY-MM-DD'));

    cy.byTestId('validUntilQuickPick-12m').click();
    cy.byTestId('validUntilInput').should('have.value', dayjs().add(6, 'months').add(12, 'months').format('YYYY-MM-DD'));
  });

  it('nationality search-by-typing narrows the list, and reverts to the last selection if nothing is picked', () => {
    cy.byTestId('countryInput').click();
    cy.get('mat-option').its('length').should('be.greaterThan', 5);

    cy.byTestId('countryInput').type('Deutsch');
    cy.get('mat-option').should('have.length', 1).and('contain.text', 'Deutschland');
    cy.get('mat-option').contains('Deutschland').click();
    cy.byTestId('countryInput').should('have.value', 'Deutschland');

    // typing without picking a result must not silently commit the typed text as the selection
    cy.byTestId('countryInput').clear().type('xyz-gibt-es-nicht');
    cy.get('mat-option').should('not.exist');
    cy.byTestId('countryInput').blur();
    cy.byTestId('countryInput').should('have.value', 'Deutschland');
  });

  it('shows the unsaved-changes indicator once the form is dirty, and Speichern is never styled as danger while merely disabled', () => {
    cy.byTestId('unsaved-changes-indicator').should('not.exist');
    cy.byTestId('save-button').should('be.disabled').and('not.have.class', 'button-danger');

    cy.byTestId('lastnameInput').type('a');
    cy.byTestId('unsaved-changes-indicator').should('be.visible').and('contain.text', 'Ungespeicherte Änderungen');
  });

  it('warns before leaving with unsaved changes and lets the operator cancel or confirm', () => {
    cy.byTestId('lastnameInput').type('Mustermann');

    cy.contains('a', 'Kunden suchen').click();
    cy.byTestId('unsavedchanges-dialog').should('be.visible');
    // the dialog exists only after this click, so no other accessibility gate sees it -
    // see cypress/support/accessibility.ts
    cy.checkDialogAccessibility();

    cy.byTestId('unsavedchanges-dialog').within(() => {
      cy.byTestId('cancel-button').click();
    });
    cy.url().should('include', '/kunden/anlegen');

    cy.contains('a', 'Kunden suchen').click();
    cy.byTestId('unsavedchanges-dialog').within(() => {
      cy.byTestId('ok-button').click();
    });
    cy.url().should('include', '/kunden/suchen');
  });

  describe('Supervisor', () => {

    beforeEach(() => {
      cy.loginDefault();
      cy.visit('/kunden/anlegen');
    });

    it('supervisor should be able to create qualified customer', () => {
      createCustomer(1000);

      cy.byTestId('validationresult-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'dialog-header-success');
          cy.byTestId('ok-button').click();
        });

      cy.byTestId('save-button').click();

      cy.url().should('include', '/kunden/detail');
    });

    it('supervisor should be able to override with warning on customer creation', () => {
      enterCustomerData();
      cy.byTestId('incomeInput').type('10000');
      // a fixed literal name here would collide with createCustomer()'s own additional person of
      // the same name+birthdate saved by an earlier test in this run - see the comment on
      // enterCustomerData above.
      enterAdditionalPersonData(0, {
        id: 0,
        key: 0,
        receivesFamilyAllowance: false,
        lastname: 'Add' + Math.floor(Math.random() * 1_000_000_000),
        firstname: 'Adult 1',
        birthDate: getBirthDateForAge(30),
        gender: Gender.MALE,
        employer: 'Test Employer',
        country: {id: 165, code: 'AT', name: 'Österreich'},
        excludeFromHousehold: false
      });

      cy.byTestId('save-button').should('be.enabled');
      cy.byTestId('validate-button').should('be.enabled');
      cy.byTestId('validate-button').click();

      cy.byTestId('validationresult-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Anspruch vorhanden');
          cy.byTestId('header').should('have.class', 'dialog-header-danger');
          cy.byTestId('ok-button').click();
        });

      cy.byTestId('save-button').should('be.enabled');
      cy.byTestId('save-button').click();

      cy.byTestId('confirm-customer-save-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').contains('Kunde speichern');
          cy.byTestId('message').contains('Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)');
          cy.byTestId('header').should('have.class', 'dialog-header-warning');
        });
      cy.checkDialogAccessibility();
      cy.byTestId('confirm-customer-save-dialog')
        .within(() => {
          cy.byTestId('ok-button').click();
        });

      cy.url().should('include', '/kunden/detail');
    });
  });

  function createCustomer(income?: number) {
    enterCustomerData();
    if (income) {
      cy.byTestId('incomeInput').type(income.toString());
    } else {
      cy.byTestId('incomeInput').type('500');
    }

    // Shared across all three - a fixed literal "Add" lastname+birthdate would make every call
    // after the first one in this run collide with an earlier call's additional person of the
    // same name+birthdate - see the comment on enterCustomerData above.
    const additionalPersonLastname = 'Add' + Math.floor(Math.random() * 1_000_000_000);
    enterAdditionalPersonData(0, {
      id: 0,
      key: 0,
      receivesFamilyAllowance: false,
      lastname: additionalPersonLastname,
      firstname: 'Adult 1',
      birthDate: getBirthDateForAge(30),
      gender: Gender.MALE,
      employer: 'test employer',
      income: 500,
      country: {id: 1, code: 'AF', name: 'Afghanistan'},
      excludeFromHousehold: false
    });
    enterAdditionalPersonData(1, {
      id: 1,
      key: 1,
      receivesFamilyAllowance: false,
      lastname: additionalPersonLastname,
      firstname: 'Child 1',
      birthDate: getBirthDateForAge(3),
      gender: Gender.FEMALE,
      income: 0,
      country: {id: 2, code: 'EG', name: 'Ägypten'},
      excludeFromHousehold: false
    });
    enterAdditionalPersonData(2, {
      id: 2,
      key: 2,
      receivesFamilyAllowance: true,
      lastname: additionalPersonLastname,
      firstname: 'Child 2',
      birthDate: getBirthDateForAge(8),
      gender: Gender.MALE,
      country: {id: 3, code: 'AX', name: 'Aland'},
      excludeFromHousehold: true
    });

    cy.byTestId('save-button').should('be.enabled');
    cy.byTestId('validate-button').should('be.enabled');

    cy.byTestId('validate-button').click();
  }

  // Several tests in this file submit this data as a real save via the actual form, which now runs
  // into the backend's duplicate check (see HouseholdService.checkForDuplicates) - a fixed literal
  // name+address would make every test after the first one collide with data an earlier test in this
  // same run already saved. A genuinely random (not clock-derived) suffix keeps every call unique:
  // cy.getAnyRandomNumber() is unsuitable here since it's timestamp-based, so two calls made close
  // together in the same run can differ in only one or two digits - close enough that the fuzzy
  // duplicate check's Levenshtein distance still flags them as a match.
  function enterCustomerData(age = 25) {
    const uniqueSuffix = Math.floor(Math.random() * 1_000_000_000);
    cy.byTestId('lastnameInput').type('Mustermann' + uniqueSuffix);
    cy.byTestId('firstnameInput').type('Max' + uniqueSuffix);
    cy.byTestId('birthDateInput').type(dayjs(getBirthDateForAge(age)).format('YYYY-MM-DD'));
    cy.byTestId('genderInput').click();
    cy.byTestId('genderInput-option-MALE').click();
    cy.byTestId('countryInput').click();
    cy.byTestId('countryInput-option-165').click();
    cy.byTestId('telephoneNumberInput').type('0664123132123');
    cy.byTestId('emailInput').type('test@gmail.com');
    cy.byTestId('streetInput').type('Teststreet');
    cy.byTestId('houseNumberInput').type('5');
    cy.byTestId('stairwayInput').type('1');
    cy.byTestId('doorInput').type('10');
    cy.byTestId('postalCodeInput').type('1010');
    cy.byTestId('cityInput').type('Wien');
    cy.byTestId('employerInput').type('Test Employer');
    cy.byTestId('validUntilInput').type(dayjs().add(2, 'years').startOf('day').format('YYYY-MM-DD'));
  }

  function enterAdditionalPersonData(index: number, data: CustomerAddPersonData) {
    cy.byTestId('addperson-button-bottom').click();

    cy.byTestId('personform-' + index).within(() => {
      cy.byTestId('lastnameInput').type(data.lastname);
      cy.byTestId('firstnameInput').type(data.firstname);
      cy.byTestId('birthDateInput').type(dayjs(data.birthDate).format('YYYY-MM-DD'));
      cy.byTestId('genderInput').click();
    });
    cy.byTestId('genderInput-option-' + data.gender).click();
    cy.byTestId('personform-' + index).within(() => {
      cy.byTestId('countryInput').click();
    });
    cy.byTestId('countryInput-option-' + data.country!.id).click();
    cy.byTestId('personform-' + index).within(() => {
      if (data.employer) {
        cy.byTestId('employerInput').type(data.employer);
      }
      if (data.income) {
        cy.byTestId('incomeInput').type(data.income.toString());
      }
      if (data.excludeFromHousehold) {
        cy.byTestId('excludeFromHouseholdInput').click();
      }
    });
  }

  function getBirthDateForAge(age: number): Date {
    return dayjs().subtract(age, 'years').startOf('day').toDate();
  }

});
