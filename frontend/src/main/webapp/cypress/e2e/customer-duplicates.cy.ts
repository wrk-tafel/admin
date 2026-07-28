import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';

describe('Customer Duplicates', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a detected duplicate pair with both customers\' details', () => {
    createDuplicateCustomerPair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/#/kunden/duplikate');

      cy.byTestId('duplicate-customer-' + customer1.id).within(() => {
        cy.byTestId('duplicate-customer-name-' + customer1.id)
          .should('contain.text', customer1.lastname)
          .and('contain.text', customer1.firstname);
        cy.contains(dayjs(customer1.birthDate).format('DD.MM.YYYY')).should('be.visible');
        cy.contains(customer1.address.street).should('be.visible');
      });

      cy.byTestId('duplicate-customer-' + customer2.id).within(() => {
        cy.byTestId('duplicate-customer-name-' + customer2.id)
          .should('contain.text', customer2.lastname)
          .and('contain.text', customer2.firstname);
      });
    });
  });

  it('navigates to the customer detail page', () => {
    createDuplicateCustomerPair().then(({first}) => {
      const customer1 = first.body.data;

      cy.visit('/#/kunden/duplikate');
      cy.byTestId('duplicate-detail-button-' + customer1.id).click();

      cy.url().should('include', '/kunden/detail/' + customer1.id);
    });
  });

  it('deletes a single customer from the duplicate pair', () => {
    createDuplicateCustomerPair().then(({second}) => {
      const customer2 = second.body.data;

      cy.visit('/#/kunden/duplikate');
      cy.byTestId('duplicate-delete-button-' + customer2.id).click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');
    });
  });

  it('merges the duplicate pair, deleting the other customer', () => {
    createDuplicateCustomerPair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/#/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde(n) wurden gelöscht');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');

      cy.visit('/#/kunden/detail/' + customer1.id);
      cy.url().should('include', '/kunden/detail/' + customer1.id);
    });
  });

});

function createDuplicateCustomerPair() {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const buildCustomer = (): CustomerData => ({
      firstname: 'Firstname' + randomNumber,
      lastname: 'Lastname' + randomNumber,
      birthDate: dayjs().subtract(30, 'year').toDate(),
      gender: Gender.MALE,
      country: {
        id: 165,
        code: 'AT',
        name: 'Österreich'
      },
      income: 1000,
      incomeDue: dayjs().add(30, 'days').toDate(),
      address: {
        street: 'Duplicatestreet' + randomNumber,
        houseNumber: '1',
        city: 'city-' + randomNumber,
        postalCode: 1234
      },
      validUntil: dayjs().add(1, 'year').toDate()
    });

    return cy.createCustomer(buildCustomer()).then(first =>
      cy.createCustomer(buildCustomer()).then(second => ({first, second}))
    );
  });
}
