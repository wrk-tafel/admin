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
        // both children receive family allowance and are in the "ab 3" tier, so 2x 148,00 plus
        // 2x the flat child tax allowance
        cy.byTestId('detail-familyallowance').should('contain.text', '296,00');
        cy.byTestId('detail-childtaxallowance').should('contain.text', '141,80');
        // two children, so the sibling addition applies at 8,60 each
        cy.byTestId('detail-siblingaddition').should('contain.text', '17,20');
        cy.byTestId('total-income').should('contain.text', '1.455,00');

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

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('lastnameInput').should('be.visible').type('Mustermann');
      cy.byTestId('save-button').should('exist');
    });
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
      enterAdditionalPersonData(0, {
        id: 0,
        key: 0,
        receivesFamilyAllowance: false,
        lastname: 'Add',
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
    enterAdditionalPersonData(1, {
      id: 1,
      key: 1,
      receivesFamilyAllowance: false,
      lastname: 'Add',
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
      lastname: 'Add',
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

  function enterCustomerData() {
    cy.byTestId('lastnameInput').type('Mustermann');
    cy.byTestId('firstnameInput').type('Max');
    cy.byTestId('birthDateInput').type(dayjs(getBirthDateForAge(25)).format('YYYY-MM-DD'));
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
