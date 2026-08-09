import dayjs from 'dayjs';
import {CustomerData, Gender} from '../support/commands';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Customer Duplicates', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('lists a detected duplicate pair with both customers\' details', () => {
    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

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
    createDuplicatePair().then(({first}) => {
      const customer1 = first.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-detail-button-' + customer1.id).click();

      cy.url().should('include', '/kunden/detail/' + customer1.id);
    });
  });

  it('deletes a single customer from the duplicate pair after confirming', () => {
    createDuplicatePair().then(({second}) => {
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-delete-button-' + customer2.id).click();

      cy.byTestId('deletecustomer-dialog').should('be.visible');
      // the dialog exists only after this click, so no other accessibility gate sees it -
      // see cypress/support/accessibility.ts
      cy.checkDialogAccessibility();

      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('cancelButton').click();
      });

      cy.byTestId('deletecustomer-dialog').should('not.exist');
      cy.byTestId('duplicate-customer-' + customer2.id).should('exist');

      cy.byTestId('duplicate-delete-button-' + customer2.id).click();
      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('okButton').click();
      });

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');
    });
  });

  it('opens the merge picker for the duplicate pair', () => {
    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${customer1.id}`);
      cy.url().should('include', `quellen=${customer2.id}`);
    });
  });

  it('stacks a duplicate pair into a single column on phone and deletion still works', () => {
    cy.viewport(PHONE_VIEWPORT);

    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

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
      cy.byTestId('deletecustomer-dialog').within(() => {
        cy.byTestId('okButton').click();
      });

      cy.get('.toast-message').should('be.visible').and('contain.text', 'Kunde wurde gelöscht!');
      cy.byTestId('duplicate-customer-' + customer2.id).should('not.exist');
    });
  });

  it('renders a duplicate pair side-by-side at tablet breakpoint and merge still works', () => {
    cy.viewport(TABLET_VIEWPORT);

    createDuplicatePair().then(({first, second}) => {
      const customer1 = first.body.data;
      const customer2 = second.body.data;

      cy.visit('/kunden/duplikate');

      // at md: (768px) the pair grid becomes 2 columns, so both cards start at the same row position
      cy.byTestId('duplicate-customer-' + customer1.id).then(($first) => {
        const firstTop = $first[0].getBoundingClientRect().top;
        cy.byTestId('duplicate-customer-' + customer2.id).then(($second) => {
          expect($second[0].getBoundingClientRect().top).to.eq(firstTop);
        });
      });

      cy.byTestId('duplicate-merge-button-' + customer1.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${customer1.id}`);
    });
  });

});

describe('Customer Merge', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('picks a conflicting field from the source and applies it to the target', () => {
    createDuplicatePair({telephoneNumber: '111111'}, {telephoneNumber: '222222'}).then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.url().should('include', `/kunden/zusammenfuehren/${target.id}`);
      cy.byTestId('merge-field-TELEPHONE_NUMBER-source-' + source.id).click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('telephoneNumberText').should('contain.text', '222222');
    });
  });

  it('re-parents an additional person that only exists on the source', () => {
    createDuplicatePair({}, {
      additionalPersons: [{
        key: 0,
        id: 0,
        firstname: 'Peter',
        lastname: 'Novak',
        birthDate: dayjs().subtract(40, 'year').toDate(),
        gender: Gender.MALE,
        country: {id: 165, code: 'AT', name: 'Österreich'},
        excludeFromHousehold: false,
        receivesFamilyAllowance: false
      }]
    }).then(({first}) => {
      const target = first.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('additionalpersons-tab-label').click();
      cy.byTestId('addperson-0-lastnameText').should('contain.text', 'Novak');
    });
  });

  it('deduplicates an additional person that exists identically on both target and source', () => {
    const sharedPerson = (): any => ({
      key: 0,
      id: 0,
      firstname: 'Anna',
      lastname: 'Schmidt',
      birthDate: dayjs().subtract(35, 'year').toDate(),
      gender: Gender.FEMALE,
      country: {id: 165, code: 'AT', name: 'Österreich'},
      excludeFromHousehold: false,
      receivesFamilyAllowance: false
    });

    createDuplicatePair(
      {additionalPersons: [sharedPerson()]},
      {additionalPersons: [sharedPerson()]}
    ).then(({first}) => {
      const target = first.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('additionalpersons-tab-label').click();
      cy.byTestId('addperson-0-lastnameText').should('contain.text', 'Schmidt');
      cy.byTestId('addperson-1-lastnameText').should('not.exist');
    });
  });

  it('re-parents a note from the source onto the target', () => {
    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.createCustomerNote(source.id!, 'note from the merged-away source');

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-confirm-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');
      cy.url().should('include', '/kunden/detail/' + target.id);
      cy.byTestId('note-text').should('contain.text', 'note from the merged-away source');
    });
  });

  it('warns about a same-distribution ticket collision and still lets the merge succeed', () => {
    cy.createDistribution();

    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.addCustomerToDistribution({customerId: target.id!, ticketNumber: 11});
      cy.addCustomerToDistribution({customerId: source.id!, ticketNumber: 22});

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();

      cy.contains('22').should('be.visible');
      cy.contains('wird verworfen').should('be.visible');

      cy.byTestId('merge-confirm-button').click();
      cy.get('.toast-message').should('be.visible').and('contain.text', 'zusammengeführt');

      cy.closeDistribution();
    });
  });

  it('cancel returns to the duplicates list without merging', () => {
    createDuplicatePair().then(({first, second}) => {
      const target = first.body.data;
      const source = second.body.data;

      cy.visit('/kunden/duplikate');
      cy.byTestId('duplicate-merge-button-' + target.id).click();
      cy.byTestId('merge-cancel-button').click();

      cy.url().should('include', '/kunden/duplikate');
      cy.byTestId('duplicate-customer-' + target.id).should('exist');
      cy.byTestId('duplicate-customer-' + source.id).should('exist');
    });
  });

});

function createDuplicatePair(firstOverrides: Partial<CustomerData> = {}, secondOverrides: Partial<CustomerData> = {}) {
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

    return cy.createCustomer({...buildCustomer(), ...firstOverrides}).then(first =>
      cy.createCustomer({...buildCustomer(), ...secondOverrides}).then(second => ({first, second}))
    );
  });
}
