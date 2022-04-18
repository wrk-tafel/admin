import * as moment from 'moment';

// TODO optimize structure

describe('Customer', () => {

  beforeEach(() => {
    cy.loginHeadlessWithTestuser();
    cy.visit('#/kunden/anlegen');
  });

  it('validate shows errorMessage', () => {
    cy.byTestId('validate-button').click();

    cy.byTestId('errorMessage').within((errorMessage) => {
      cy.byTestId('errorMessageContent').should('have.text', 'Bitte Eingaben überprüfen!');
    });
  });

  it('create new valid customer without existing customerId', () => {
    createCustomer();

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Anspruch vorhanden');
        cy.byTestId('validationresult-modal-dialog').should('have.class', 'modal-success');
        cy.byTestId('ok-button').click();
      });

    cy.byTestId('save-button').click();

    cy.url().should('include', '/kunden/detail')
  });

  it('create new valid customer with existing customerId', () => {
    const customerId = getRandomNumber(20000, 500000);
    createCustomer(customerId);

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Anspruch vorhanden');
        cy.byTestId('validationresult-modal-dialog').should('have.class', 'modal-success');
        cy.byTestId('ok-button').click();
      });

    cy.byTestId('save-button').click();

    cy.url().should('include', '/kunden/detail/' + customerId);
  });

  it('create new invalid customer without existing customerId', () => {
    createCustomer(0, 10000);

    cy.byTestId('validationresult-modal')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').contains('Kein Anspruch vorhanden');
        cy.byTestId('validationresult-modal-dialog').should('have.class', 'modal-danger');
        cy.byTestId('ok-button').click();
      });

    cy.byTestId('save-button').should('be.disabled');
  });

  function createCustomer(customerId?: number, income?: number) {
    if (customerId) {
      cy.byTestId('customerIdInput').type(customerId);
    }
    enterCustomerData();
    if (income) {
      cy.byTestId('incomeInput').type(income);
    } else {
      cy.byTestId('incomeInput').type('500');
    }

    enterAdditionalPersonData(0, {
      lastname: 'Add',
      firstname: 'Adult 1',
      age: 30,
      income: 500
    });
    enterAdditionalPersonData(1, {
      lastname: 'Add',
      firstname: 'Child 1',
      age: 3,
      income: 0
    });
    enterAdditionalPersonData(2, {
      lastname: 'Add',
      firstname: 'Child 2',
      age: 8
    });

    cy.byTestId('save-button').should('be.disabled');
    cy.byTestId('validate-button').should('be.enabled');

    cy.byTestId('validate-button').click();
  }

  function enterCustomerData() {
    cy.byTestId('lastnameInput').type('Mustermann');
    cy.byTestId('firstnameInput').type('Max');
    cy.byTestId('birthDateInput').type(moment().subtract(25, 'years').startOf('day').format('YYYY-MM-DD'));
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
    cy.byTestId('incomeDueInput').type(moment().add(2, 'years').startOf('day').format('YYYY-MM-DD'));
  }

  function enterAdditionalPersonData(index: number, data: AddPersonInputData) {
    cy.byTestId('addperson-button').click();

    cy.byTestId('personform-' + index).within(() => {
      cy.byTestId('lastnameInput').type(data.lastname);
      cy.byTestId('firstnameInput').type(data.firstname);
      cy.byTestId('birthDateInput').type(moment().subtract(data.age, 'years').startOf('day').format('YYYY-MM-DD'));
      if (data.income !== undefined) {
        cy.byTestId('incomeInput').type(data.income);
      }
    });
  }

});

interface AddPersonInputData {
  lastname: string,
  firstname: string,
  age: number,
  income?: number
}

function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
