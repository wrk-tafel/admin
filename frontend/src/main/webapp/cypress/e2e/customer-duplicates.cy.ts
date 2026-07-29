import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

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

  it('stacks a duplicate pair into a single column on phone and deletion still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    createDuplicateCustomerPair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/#/kunden/duplikate');

      cy.byTestId('duplicate-customer-' + customer1.id).scrollIntoView().should('be.visible');
      cy.byTestId('duplicate-customer-' + customer2.id).scrollIntoView().should('be.visible');

      // below md: the pair grid collapses to a single column, so the cards stack on separate rows
      // instead of sitting side by side (API/render order between the two isn't guaranteed, so
      // just assert they're not on the same row rather than assuming which one comes first)
      cy.byTestId('duplicate-customer-' + customer1.id).then(($first) => {
        const firstTop = $first[0].getBoundingClientRect().top;
        cy.byTestId('duplicate-customer-' + customer2.id).then(($second) => {
          expect($second[0].getBoundingClientRect().top).to.not.equal(firstTop);
        });
      });

      cy.byTestId('duplicate-delete-button-' + customer2.id).click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');
    });
  });

  it('renders a duplicate pair side-by-side at tablet breakpoint and merge still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    createDuplicateCustomerPair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/#/kunden/duplikate');

      // at md: (768px) the pair grid becomes 2 columns, so both cards start at the same row position
      cy.byTestId('duplicate-customer-' + customer1.id).then(($first) => {
        const firstTop = $first[0].getBoundingClientRect().top;
        cy.byTestId('duplicate-customer-' + customer2.id).then(($second) => {
          expect($second[0].getBoundingClientRect().top).to.eq(firstTop);
        });
      });

      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde(n) wurden gelöscht');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');
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
