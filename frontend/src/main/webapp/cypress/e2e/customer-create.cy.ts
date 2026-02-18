import * as moment from 'moment';
import {CustomerAddPersonData, Gender} from '../support/commands';

// TODO optimize structure

describe('Customer Creation', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/kunden/anlegen');
  });

  it('create new qualified customer', () => {
    createCustomer();

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'bg-success');
        cy.byTestId('ok-button').click();
      });

    cy.intercept('POST', '/api/customers').as('createCustomer');
    cy.byTestId('save-button').click();
    cy.wait('@createCustomer');

    cy.url().should('include', '/kunden/detail');
  });

  it('create new customer not qualified', () => {
    createCustomer(0, 10000);

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Kein Anspruch vorhanden');
        cy.byTestId('header').should('have.class', 'bg-danger');
        cy.byTestId('ok-button').click();
      });

    cy.byTestId('save-button').should('be.disabled');
  });

  function createCustomer(customerId?: number, income?: number) {
    if (customerId) {
      cy.byTestId('customerIdInput').type(customerId.toString());
    }
    enterCustomerData();
    if (income) {
      cy.byTestId('incomeInput').type(income.toString());
    } else {
      cy.byTestId('incomeInput').type('500');
    }

    enterAdditionalPersonData(0, {
      id: 0,
      key: 0,
      receivesFamilyBonus: false,
      lastname: 'Add',
      firstname: 'Adult 1',
      birthDate: getBirthDateForAge(30),
      gender: Gender.MALE,
      employer: 'test employer',
      income: 500,
      country: {id: 0, code: 'AT', name: 'Österreich'},
      excludeFromHousehold: false
    });
    enterAdditionalPersonData(1, {
      id: 1,
      key: 1,
      receivesFamilyBonus: false,
      lastname: 'Add',
      firstname: 'Child 1',
      birthDate: getBirthDateForAge(3),
      gender: Gender.FEMALE,
      income: 0,
      country: {id: 1, code: 'DE', name: 'Deutschland'},
      excludeFromHousehold: false
    });
    enterAdditionalPersonData(2, {
      id: 2,
      key: 2,
      receivesFamilyBonus: true,
      lastname: 'Add',
      firstname: 'Child 2',
      birthDate: getBirthDateForAge(8),
      gender: Gender.MALE,
      country: {id: 2, code: 'CH', name: 'Schweiz'},
      excludeFromHousehold: true
    });

    cy.byTestId('save-button').should('be.disabled');
    cy.byTestId('validate-button').should('be.enabled');

    cy.byTestId('validate-button').click();
  }

  function enterCustomerData() {
    cy.byTestId('lastnameInput').type('Mustermann');
    cy.byTestId('firstnameInput').type('Max');
    cy.byTestId('birthDateInput').type(moment(getBirthDateForAge(25)).format('YYYY-MM-DD'));
    cy.byTestId('genderInput').select('Männlich');
    cy.byTestId('countryInput').select('Österreich');
    cy.byTestId('telephoneNumberInput').type('0664123132123');
    cy.byTestId('emailInput').type('test@gmail.com');
    cy.byTestId('streetInput').type('Teststreet');
    cy.byTestId('houseNumberInput').type('5');
    cy.byTestId('stairwayInput').type('1');
    cy.byTestId('doorInput').type('10');
    cy.byTestId('postalCodeInput').type('1010');
    cy.byTestId('cityInput').type('Wien');
    cy.byTestId('employerInput').type('Test Employer');
    cy.byTestId('validUntilInput').type(moment().add(2, 'years').startOf('day').format('YYYY-MM-DD'));
  }

  function enterAdditionalPersonData(index: number, data: CustomerAddPersonData) {
    cy.byTestId('addperson-button-bottom').click();

    cy.byTestId('personform-' + index).within(() => {
      cy.byTestId('lastnameInput').type(data.lastname);
      cy.byTestId('firstnameInput').type(data.firstname);
      cy.byTestId('birthDateInput').type(moment(data.birthDate).format('YYYY-MM-DD'));
      cy.byTestId('genderInput').select(data.gender);
      cy.byTestId('countryInput').select(data.country.name);
      if (data.employer) {
        cy.byTestId('employerInput').type(data.employer);
      }
      if (data.income) {
        cy.byTestId('incomeInput').type(data.income.toString());
      }
      if (data.excludeFromHousehold) {
        cy.byTestId('excludeFromHouseholdInput').check();
      }
    });
  }

  function getBirthDateForAge(age: number): Date {
    return moment().subtract(age, 'years').startOf('day').toDate();
  }

});
