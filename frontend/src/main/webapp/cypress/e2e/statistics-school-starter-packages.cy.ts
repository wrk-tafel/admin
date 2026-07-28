import * as path from 'path';
import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';

describe('Statistics School Starter Packages', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a household member within the default age range', () => {
    createCustomerWithChildAge(8).then((response) => {
      const customer = response.body.data;
      const child = customer.additionalPersons![0];

      cy.visit('/#/statistiken/schulstartpakete');

      cy.byTestId('schoolStarterPackageAgeMinInput').should('have.value', '6');
      cy.byTestId('schoolStarterPackageAgeMaxInput').should('have.value', '10');

      cy.byTestId('school-starter-package-table')
        .contains('tr', child.lastname)
        .within(() => {
          cy.get('td').eq(0).should('have.text', customer.id!.toString());
          cy.get('td').eq(1).should('have.text', child.firstname);
          cy.get('td').eq(2).should('have.text', child.lastname);
          cy.get('td').eq(3).should('have.text', '8');
        });
    });
  });

  it('excludes a household member outside the given age range', () => {
    createCustomerWithChildAge(20).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/#/statistiken/schulstartpakete');

      cy.contains(child.lastname).should('not.exist');
    });
  });

  it('reloads the list when the age range changes', () => {
    createCustomerWithChildAge(15).then((response) => {
      const child = response.body.data.additionalPersons![0];

      cy.visit('/#/statistiken/schulstartpakete');
      cy.contains(child.lastname).should('not.exist');

      cy.byTestId('schoolStarterPackageAgeMinInput').clear().type('11');
      cy.byTestId('schoolStarterPackageAgeMaxInput').clear().type('16');

      cy.byTestId('school-starter-package-table').contains(child.lastname).should('be.visible');
    });
  });

  it('exports the school starter package report as csv', () => {
    cy.visit('/#/statistiken/schulstartpakete');

    cy.contains('CSV-Export').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const today = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `schulstartpakete_${today}.csv`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(0));
  });

});

function createCustomerWithChildAge(age: number) {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const data: CustomerData = {
      firstname: 'firstname-' + randomNumber,
      lastname: 'lastname-' + randomNumber,
      birthDate: dayjs().subtract(25, 'year').toDate(),
      gender: Gender.MALE,
      country: {
        id: 165,
        code: 'AT',
        name: 'Österreich'
      },
      income: 1000,
      incomeDue: dayjs().add(30, 'days').toDate(),
      address: {
        street: 'street-' + randomNumber,
        houseNumber: '1A',
        city: 'city-' + randomNumber,
        postalCode: 1234
      },
      validUntil: dayjs().add(1, 'year').toDate(),
      additionalPersons: [{
        id: 0,
        key: 0,
        firstname: 'child-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(age, 'year').toDate(),
        gender: Gender.MALE,
        country: {
          id: 165,
          code: 'AT',
          name: 'Österreich'
        },
        excludeFromHousehold: false,
        receivesFamilyAllowance: false
      }]
    };
    return cy.createCustomer(data);
  });
}
